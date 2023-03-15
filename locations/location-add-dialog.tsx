import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useApolloClient, useReactiveVar } from "@apollo/client";
import isEmpty from "lodash/isEmpty";
import { Color } from "@material-ui/lab/Alert";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import Button from "@material-ui/core/Button";
import DialogActions from "@material-ui/core/DialogActions";
import { ValidatorForm } from "react-material-ui-form-validator";
import { MercadoAlert } from "react/common/components/mercadoAlert";
import {
  createLocation,
  updateLocation,
} from "../graphql/mutations/locationMutations";
import { getLookupField } from "react/graphql/queries/lookupFieldQueries";
import { userById } from "react/graphql/queries/userQueries";
import { FieldsGrid } from "../fields-grid/fields-grid";
import { locationFieldsMap } from "./locations-data-fields-map";
import {
  autoGenerateLocationIdentifier,
  processLocationConfiguration,
  processStateConfiguration,
} from "./location-utils";
import { validateLocationIdentifier } from "react/graphql/queries/locationQueries";

export interface ILocationAddDialogProps {
  onSuccess: Function;
  location?: any;
  title: String;
}

export const LocationAddDialog = forwardRef(
  (props: ILocationAddDialogProps, ref) => {
    const { onSuccess = () => {}, location: propsLocation, title } = props;

    const client = useApolloClient();
    const user = useReactiveVar(userById);
    const [location, setLocation] = useState(propsLocation);
    const [stateTypeList, setStateTypeList] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setMsg] = useState("");
    const [fieldsMap, setFieldsMap] = useState(locationFieldsMap);
    const [severity, setSeverity] = useState("success");
    const alertRef = useRef(null);
    const newLocationRef = useRef({} as any);

    const [isOpen, setIsOpen] = useState(false);
    useImperativeHandle(ref, () => ({
      open() {
        setIsOpen(true);
      },
      close() {
        setIsOpen(false);
      },
    }));

    const getValidLocationIdentifier = async (originValue: string) => {
      const originRandomNumber = Number(
        originValue.substring(originValue.length - 6),
      );

      let newValue;
      let index = 1;
      let isValid = false;

      while (!isValid) {
        newValue = `${originValue.substring(0, originValue.length - 6)}${
          originRandomNumber + index
        }`;
        // eslint-disable-next-line no-await-in-loop
        isValid = await validateLocationIdentifier(client, {
          locationIdentifier: newValue,
        });
        index++;
      }

      return newValue;
    };

    const generateLocationIdentifier = async () => {
      const locationIdentifier = autoGenerateLocationIdentifier(user.org);

      const isLocationIdentifierValid = await validateLocationIdentifier(
        client,
        {
          locationIdentifier,
        },
      );
      if (isLocationIdentifierValid) {
        setLocation({ externalIdentifier: locationIdentifier });
        newLocationRef.current.externalIdentifier = locationIdentifier;
        return;
      }

      const newLocationIdentifier = await getValidLocationIdentifier(
        locationIdentifier,
      );
      setLocation({ externalIdentifier: newLocationIdentifier });
      newLocationRef.current.externalIdentifier = newLocationIdentifier;
    };

    useEffect(() => {
      if (!user) return;

      // if propsLocation is empty, it means user creates a new location
      if (isEmpty(propsLocation)) {
        generateLocationIdentifier();
      }
      else {
        setLocation(propsLocation);
      }
    }, [user, propsLocation]);

    useEffect(() => {
      if (!isOpen) return;

      const _location = propsLocation;
      const sendRequest = async () => {
        setIsLoading(true);

        const data = await getLookupField(client, {
          buyerOrgId: user.org.id,
        });
        const locationConfigurationResponse = processLocationConfiguration(
          data?.lookupFields,
          _location?.countryObject?.id,
        );
        setFieldsMap(locationConfigurationResponse);
        setStateTypeList(data?.lookupFields?.states?.options);
        setIsLoading(false);

        newLocationRef.current.isConsolidationLocation =
          _location?.isConsolidationLocation;
        newLocationRef.current.isPickupLocation = _location?.isPickupLocation;
      };
      sendRequest();
    }, [isOpen, propsLocation]);

    const onSaveComplete = msg => {
      setMsg(msg);
      setSeverity("success");
      alertRef.current.open();
      onSuccess();
      setIsOpen(false);
    };

    const saveLocation = async () => {
      setIsSaving(true);
      const saveData = newLocationRef.current;
      if (saveData.stateId !== undefined) {
        saveData.state = stateTypeList.find(
          s => s.id === saveData.stateId,
        )?.value;
      }

      if (location?.id) {
        // Edit location
        setIsLoading(true);
        const { errors, data } = await updateLocation({
          client,
          variables: {
            ...saveData,
            locationId: location?.id,
          },
        });

        if (errors) {
          setMsg("Unable to update the location"); // ToDo: translate
          setSeverity("error");
          alertRef.current.open();
        }
        else {
          if (data.editLocation?.identifierStatus === "DUPLICATED") {
            onSaveComplete(
              "Location updated, but could not set location id because that LocationID is already being used.",
            );
          }
          else {
            onSaveComplete("Location updated");
          }

          newLocationRef.current = {};
        }
      }
      else {
        // Create location
        setIsLoading(true);
        const { errors, data } = await createLocation({
          client,
          variables: {
            ...saveData,
            isActive: true,
          },
        });

        if (errors) {
          setMsg("Unable to create location"); // ToDo: translate
          setSeverity("error");
          alertRef.current.open();
        }
        else {
          if (data.createLocation?.identifierStatus === "DUPLICATED") {
            onSaveComplete(
              "Location added, but could not set location id because that LocationID is already being used.",
            );
          }
          else {
            onSaveComplete("Location added");
          }
          newLocationRef.current = {};
        }
      }
      setIsLoading(false);
      setIsSaving(false);
    };

    // eslint-disable-next-line no-unused-vars
    const onFormError = errors => {
      // ToDo
    };

    const onFieldChange = ({ id, value }) => {
      // Gather all the edits.
      // value may be string, bool, object {id, value}.
      if (id === "countryObject") {
        // Update states list when a country is selected
        const _fieldsMap = [...fieldsMap];
        const stateMap = _fieldsMap.find(
          ofield => ofield.editField === "states",
        );
        stateMap.options = processStateConfiguration(stateTypeList, value.id);
        if (location?.id) {
          setLocation({
            ...location,
            countryObject: value,
            stateId: undefined,
          });
        }
        setFieldsMap(_fieldsMap);
      }

      const fieldMap = fieldsMap.find(f => f.fields.includes(id));
      if (fieldMap) {
        const mutationKey = fieldMap.mutKey || id;
        if (value?.id !== undefined) {
          newLocationRef.current[mutationKey] = value.id;
        }
        else {
          newLocationRef.current[mutationKey] = value;
        }
      }
      else {
        newLocationRef.current[id] = value;
      }
    };

    function renderActions() {
      return (
        !isLoading &&
        !isSaving && (
          <>
            <DialogActions>
              <Button onClick={() => setIsOpen(false)} color="primary">
                Cancel
              </Button>
              <Button type="submit" color="primary">
                Save
              </Button>
            </DialogActions>
          </>
        )
      );
    }

    function renderForm() {
      return (
        <DialogContent>
          <ValidatorForm onSubmit={saveLocation} onError={onFormError}>
            <FieldsGrid
              title=""
              mode="create"
              fieldsMap={fieldsMap}
              data={location}
              disabled={false}
              loading={isLoading}
              onChange={onFieldChange}
            />
            {renderActions()}
          </ValidatorForm>
        </DialogContent>
      );
    }

    return (
      <>
        <Dialog
          open={isOpen}
          onClose={() => onSuccess()}
          aria-labelledby="form-dialog-title"
          maxWidth="lg"
          fullWidth={true}
        >
          <DialogTitle id="form-dialog-title">{title}</DialogTitle>
          {renderForm()}
        </Dialog>
        <MercadoAlert
          ref={alertRef}
          severity={severity as Color}
          message={errorMsg}
        />
      </>
    );
  },
);
