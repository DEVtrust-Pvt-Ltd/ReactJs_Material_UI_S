import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useQuery,
  useLazyQuery,
  useReactiveVar,
  useMutation,
} from "@apollo/client";
import { makeStyles } from "@material-ui/core/styles";
import Checkbox from "@material-ui/core/Checkbox";
import IconButton from "@material-ui/core/IconButton";
import Skeleton from "@material-ui/lab/Skeleton";
import Typography from "@material-ui/core/Typography";
import Edit from "@material-ui/icons/Edit";
import Button from "@material-ui/core/Button";
import { AutoCompleteSelectVirtualized } from "../common/components/autocomplete-select-virtualized";

import { GET_USER, userById } from "react/graphql/queries/userQueries";
import { GET_LOOKUPS } from "../graphql/queries/lookupQueries";
import { UPDATE_ORG_PREFERENCES } from "../graphql/mutations/preferencesMutations";
import { GET_PREFERENCES_BY_COMPANY_ID } from "react/graphql/queries/companyQueries";
import {
  FieldPreferenceContext,
  FieldPreferenceModal,
} from "./field-preference-modal";
import { MercadoAlert } from "react/common/components/mercadoAlert";

export interface IFieldPreferencesProps {}

export const FieldPreferences: FunctionComponent<
  IFieldPreferencesProps
> = () => {
  const user = useReactiveVar(userById);
  const [preferences, setPreferences] = useState<any>();
  const classes = useStyles();
  const [editedPrefsState, setEditedPrefsState] = useState({} as any);
  const [saving, setSaving] = useState(false);
  const [productIdentifier, setProductIdentifier] = useState({} as any);
  const [productIdentifiers, setProductIdentifiers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContext, setModalContext] = useState<FieldPreferenceContext>();
  const [errorMsg, setErrorMsg] = useState<string>();

  const alertRef = useRef(null);

  const { data: lookupsRes, loading: isLoadingLookups } = useQuery(
    GET_LOOKUPS,
    {
      variables: { filter: "ProductIdentifier" },
    }
  );
  const [
    fetchOrgPreferences,
    { data: preferenceData, loading: isLoadingPreferences },
  ] = useLazyQuery(GET_PREFERENCES_BY_COMPANY_ID, {
    fetchPolicy: "network-only",
  });
  const [updateOrgPreferences] = useMutation(UPDATE_ORG_PREFERENCES, {
    update: (cache, { data: { updateOrgPreferences: org } }) => {
      cache.writeQuery({
        query: GET_USER,
        data: { userById: org },
      });
      userById(org);
    },
  });

  useEffect(() => {
    setProductIdentifiers(lookupsRes?.lookups ?? []);
  }, [lookupsRes]);

  useEffect(() => {
    if (user?.org?.id) {
      fetchOrgPreferences({
        variables: {
          orgId: user?.org?.id,
        },
      });
    }
  }, [fetchOrgPreferences]);

  useEffect(() => {
    if (preferenceData && !isLoadingPreferences) {
      setPreferences(preferenceData.companyById?.preferences);
    }
  }, [preferenceData, isLoadingPreferences]);

  useEffect(() => {
    if (!preferences) return;

    const _editedPrefsState = { ...editedPrefsState };
    if (preferences?.useDateRange != null) {
      _editedPrefsState.useDateRange = preferences?.useDateRange;
    }
    setEditedPrefsState(_editedPrefsState);
    setProductIdentifier({ value: preferences?.product?.identifier });
  }, [preferences]);

  const storeCheckboxPrefs = useCallback(
    (event, field) => {
      const isChecked = event.target.checked;
      const _editedPrefsState = { ...editedPrefsState };
      _editedPrefsState[field] = isChecked;
      setEditedPrefsState(_editedPrefsState);
    },
    [editedPrefsState]
  );

  const onProductIdentifierChange = useCallback(
    (event, val) => {
      const _editedPrefsState = { ...editedPrefsState };
      _editedPrefsState.product = { identifier: val.value };
      setEditedPrefsState(_editedPrefsState);
      setProductIdentifier(val);
    },
    [editedPrefsState]
  );

  const savePrefs = useCallback(async () => {
    setSaving(true);
    const _editedPrefsState = {};
    Object.keys(editedPrefsState).forEach((key) => {
      if (editedPrefsState[key] != null) {
        _editedPrefsState[key] = editedPrefsState[key];
      }
    });

    await updateOrgPreferences({
      variables: {
        preferences: _editedPrefsState,
      },
    });
    fetchOrgPreferences({
      variables: {
        orgId: user?.org?.id,
      },
    });
    setSaving(false);
  }, [editedPrefsState, updateOrgPreferences, fetchOrgPreferences, user]);

  const openOrderHeaderModal = useCallback(() => {
    setModalContext("orderHeader");
    setIsModalOpen(true);
  }, []);

  const openOrderLineItemModal = useCallback(() => {
    setModalContext("orderLineItem");
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  if (isLoadingLookups || isLoadingPreferences) {
    return (
      <div className={classes.container}>
        <Skeleton animation="wave" className={classes.skeleton} />
        <Skeleton animation="wave" className={classes.skeleton} />
        <Skeleton animation="wave" className={classes.skeleton} />
      </div>
    );
  }

  return (
    <>
      <div className={classes.container}>
        <div className={classes.fieldContainer}>
          <div>
            <Typography className={classes.descriptionHeader} color="primary">
              Product Identifier
            </Typography>
            <Typography color="primary">
              When listed on an Order, product identifiers will be labeled as:
            </Typography>
            <div className={classes.textInput}>
              <AutoCompleteSelectVirtualized
                value={productIdentifier}
                defaultValue={{ value: preferences?.product?.identifier }}
                options={productIdentifiers}
                getOptionLabel={(option) => option?.value || ""}
                getOptionSelected={(option, val) =>
                  option?.value === val?.value
                }
                renderInputProps={{}}
                onChange={onProductIdentifierChange}
              />
            </div>
          </div>
        </div>
        <div className={classes.row}>
          <Checkbox
            checked={editedPrefsState.useDateRange === true}
            onChange={(event) => storeCheckboxPrefs(event, "useDateRange")}
          />
          <div>
            <Typography className={classes.descriptionHeader} color="primary">
              Date Range
            </Typography>
            <Typography color="primary">
              Display Ship by Date and Deliver by Date as Date Ranges
            </Typography>
          </div>
        </div>
        <div className={classes.fieldContainer}>
          <Typography className={classes.descriptionHeader} color="primary">
            Purchase Order Fields
          </Typography>
          <div style={{ display: "flex" }}>
            <Typography color="primary">
              Show and hide Details fields on the Purchase Order tab
            </Typography>
            <IconButton onClick={openOrderHeaderModal}>
              <Edit color="secondary" />
            </IconButton>
          </div>
          <div style={{ display: "flex" }}>
            <Typography color="primary">
              Show and hide Line Item fields on the Purchase Order tab
            </Typography>
            <IconButton onClick={openOrderLineItemModal}>
              <Edit color="secondary" />
            </IconButton>
          </div>
        </div>

        <Button
          className={classes.button}
          variant="contained"
          color="secondary"
          onClick={savePrefs}
          disabled={saving}
        >
          Save
        </Button>
      </div>
      <FieldPreferenceModal
        open={isModalOpen}
        closeModal={closeModal}
        context={modalContext}
        preferences={preferences}
        setErrorMsg={setErrorMsg}
        alertRef={alertRef}
        updateOrgPreferences={updateOrgPreferences}
      />
      <MercadoAlert ref={alertRef} message={errorMsg} />
    </>
  );
};

const useStyles = makeStyles({
  container: {
    marginBottom: "5rem",
  },
  row: {
    width: "100%",
    display: "flex",
    marginBottom: "2rem",
  },
  fieldContainer: {
    padding: "1.5rem",
    marginBottom: "2rem",
  },
  descriptionHeader: {
    fontSize: "2rem",
  },
  textInput: {
    maxWidth: "50rem",
  },
  button: {
    marginLeft: "1.5rem",
  },
  skeleton: {
    flex: 1,
    height: "3rem",
  },
});
