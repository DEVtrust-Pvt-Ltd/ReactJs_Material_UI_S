import { useApolloClient, useMutation, useReactiveVar } from "@apollo/client";
import {
  Button,
  Checkbox,
  DialogActions,
  FormControlLabel,
  Modal,
} from "@material-ui/core";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import Edit from "@material-ui/icons/Edit";
import cloneDeep from "lodash/cloneDeep";
import * as React from "react";
import { FunctionComponent, useEffect, useRef, useState } from "react";
import { MercadoAlert } from "react/common/components/mercadoAlert";
import { userById } from "react/graphql/queries/userQueries";
import { MercadoColors } from "../common/material-config";
import {
  CREATE_BOOKING_REQUEST_DOCUMENTS_REQUIRED_FIELDS,
  EDIT_BOOKING_REQUEST_DOCUMENTS_REQUIRED_FIELDS,
} from "../graphql/mutations/bookingRequestDocumentsRequiredFields";
import {
  getDocumentsLookupFields,
  getDocumentsRequiredFields,
} from "../graphql/queries/getBookingRequestRequiredDocumentsFields";

export interface IRequiredDocumentsFields {
  title: string;
  key: string;
  value: boolean;
  __typename?: string;
}

export const DocumentPreferences: FunctionComponent = () => {
  const classes = useStyles();
  const client = useApolloClient();
  const user = useReactiveVar(userById);
  const orgId = user?.org?.id;
  const [errorMsg, setMsg] = useState("");
  const alertRef = useRef(null);
  const [canEdit, setCanEdit] = useState(false);
  const [documentsFields, setDocumentsFields] =
    useState<IRequiredDocumentsFields[]>();
  const [documentsFieldsStored, setDocumentsStoredFields] =
    useState<IRequiredDocumentsFields[]>();
  const [modalOpened, setModalOpened] = useState(false);
  const [editRequiredDocumentsMutation] = useMutation(
    EDIT_BOOKING_REQUEST_DOCUMENTS_REQUIRED_FIELDS
  );
  const [createRequiredDocumentsMutation] = useMutation(
    CREATE_BOOKING_REQUEST_DOCUMENTS_REQUIRED_FIELDS
  );

  useEffect(() => {
    if (!orgId) return;
    getDocumentsFields(client, orgId);
  }, [orgId]);
  useEffect(() => {
    if (modalOpened && orgId) {
      setDocumentsFields(cloneDeep(documentsFieldsStored));
    }
  }, [modalOpened]);

  const getDocumentsFields = async (client, orgId) => {
    const { data, errors } = await getDocumentsRequiredFields(client, {
      orgId,
    });
    if (data && data?.bookingRequestDocumentsRequiredFields?.fields) {
      setCanEdit(true);
      try {
        const documentsRequiredFields =
          data.bookingRequestDocumentsRequiredFields.fields;
        const mergedShipments = cloneDeep(documentsRequiredFields);
        setDocumentsFields(mergedShipments);
        setDocumentsStoredFields(mergedShipments);
      } catch (error) {
        console.log("error...");
      }
    } else {
      const { data: documentLookupFields, errors } =
        await getDocumentsLookupFields(client);
      let defaultFields: IRequiredDocumentsFields[] = [];
      documentLookupFields?.lookupFields?.documentTypes?.options.forEach(
        (fields) => {
          fields?.value &&
            defaultFields.push({
              title: fields?.value,
              key: fields?.id,
              value: false,
            });
        }
      );
      setDocumentsFields(cloneDeep(defaultFields));
      setDocumentsStoredFields(cloneDeep(defaultFields));
    }
  };

  const onChangeCheckbox = (
    checked: boolean,
    field: { key: string; value: boolean }
  ) => {
    const newShipments = documentsFields.map((orgField) => {
      if (orgField.key === field.key) {
        orgField.value = checked;
      }
      return orgField;
    });
    setDocumentsFields(newShipments);
  };

  const setAllFieldsValues = (value: boolean) => {
    const newDocuments = documentsFields.map((orgField) => {
      orgField.value = value;
      return orgField;
    });
    setDocumentsFields(newDocuments);
  };

  const saveFields = async () => {
    try {
      if (canEdit) {
        await editFields();
      } else {
        await createFields();
      }
      setDocumentsStoredFields(cloneDeep(documentsFields));
      setModalOpened(false);
    } catch (error) {
      setMsg("Error while saving preferences."); // TODO: translate
      alertRef.current.open();
    }
  };

  const editFields = async () => {
    const _documentFields = [];
    documentsFields.forEach((doc) => {
      const { __typename, ...rest } = doc;
      _documentFields.push(rest);
    });
    await editRequiredDocumentsMutation({
      client,
      variables: {
        input: { fields: _documentFields },
      },
    });
  };

  const createFields = async () => {
    await createRequiredDocumentsMutation({
      client,
      variables: {
        input: { fields: documentsFields },
      },
    });
    setCanEdit(true);
  };

  return (
    <>
      <div
        onClick={() => {
          setModalOpened(true);
        }}
        className={classes.flexCenter}
      >
        <Edit color="secondary"></Edit>
      </div>
      <Modal
        open={modalOpened}
        onClose={() => {
          setModalOpened(false);
        }}
        aria-labelledby="modal-modal-key"
        aria-describedby="modal-modal-description"
      >
        <div className={"container " + classes.flexContainer}>
          <div className={classes.modalShipmentPreferencesWrapper}>
            <div className={"row"}>
              <div className={"col-xs-12 " + classes.flexCenter}>
                <h4>
                  Selected document types are required to create Booking Request
                </h4>
              </div>
              <div
                className={
                  "col-lg-5 col-md-5 col-sm-5 col-xs-5 " + classes.buttonPadding
                }
              >
                <div className={classes.flexRight}>
                  <Button
                    color="secondary"
                    className={classes.marginRight}
                    onClick={() => {
                      setAllFieldsValues(true);
                    }}
                  >
                    Select All
                  </Button>
                </div>
              </div>
              <div
                className={
                  "col-lg-5 col-md-5 col-sm-5 col-xs-5 " + classes.buttonPadding
                }
              >
                <div className={classes.flexCenter}>
                  <Button
                    color="secondary"
                    onClick={() => {
                      setAllFieldsValues(false);
                    }}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
              <div className={"col-lg-12 col-md-12 col-sm-12 col-xs-12"}>
                <div className={classes.minSection}>
                  <div className={"row"}>
                    {documentsFields &&
                      documentsFields?.map((field) => {
                        return (
                          <div className={"col-md-6"}>
                            <div
                              className={
                                classes.modalShipmentPreferencesSelectBox
                              }
                            >
                              <FormControlLabel
                                key={field.key}
                                className={
                                  classes.modalShipmentPreferencesSelectBoxItem
                                }
                                control={
                                  <Checkbox
                                    checked={field.value}
                                    onChange={(e) => {
                                      onChangeCheckbox(e.target.checked, field);
                                    }}
                                  />
                                }
                                label={field.title}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  <div className={"col-xs-12 " + classes.flexRight}>
                    {/* {!isLoading && !isSaving && ( */}
                    <DialogActions>
                      <Button
                        className={classes.buttonColor}
                        onClick={() => {
                          setModalOpened(false);
                        }}
                        color="secondary"
                      >
                        Cancel
                      </Button>
                      <Button
                        className={classes.buttonColor}
                        onClick={() => saveFields()}
                        type="submit"
                        color="secondary"
                      >
                        Save
                      </Button>
                    </DialogActions>
                    {/* )} */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
      <MercadoAlert ref={alertRef} message={errorMsg} />
    </>
  );
};

const useStyles = makeStyles((theme) =>
  createStyles({
    iconSize: {
      fontSize: "4rem",
    },
    spinnerContainer: {
      alignSelf: "center",
      margin: "0 2.5rem 0 2.5rem",
    },
    icon: {
      color: MercadoColors.purple,
    },
    buttonPadding: {
      padding: "15px 0",
    },
    flexContainer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      border: "none",
      outline: "none",
      overflow: "auto",
    },
    flexCenter: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    flexRight: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      width: "100%",
    },
    modalShipmentPreferencesWrapper: {
      backgroundColor: "white",
      height: "80%",
      overflowY: "scroll",
      maxWidth: "655px",
      padding: "25px",
      paddingLeft: "35px",
      paddingRight: "16px",
      [theme.breakpoints.down("md")]: {
        height: "100%",
      },
    },
    modalShipmentPreferencesSelectBoxItem: {
      minWidth: "85%",
      flexFlow: "row-reverse",
      justifyContent: "space-between",
      [theme.breakpoints.down("md")]: {
        minWidth: "80%",
      },
    },
    modalShipmentPreferencesSelectBox: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      [theme.breakpoints.up("md")]: {
        maxHeight: "490px",
        flexWrap: "wrap",
      },
    },
    buttonColor: {
      backgroundColor: "#1ab394",
      borderColor: "#1ab394",
      color: "white",
      "&:hover, &:focus": {
        backgroundColor: "#1ab394",
      },
    },
    minSection: {
      maxWidth: "600px",
      margin: "0px auto",
    },
    marginRight: {
      marginRight: "25px",
    },
  })
);