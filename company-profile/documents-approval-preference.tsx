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
import { getDocumentsApprovalFields } from "react/graphql/queries/getDocumentsApprovalFieldsQueries";
import { userById } from "react/graphql/queries/userQueries";
import { MercadoColors } from "../common/material-config";
import {
  EDIT_ORDER_DOCUMENTS_APPROVAL_FIELDS,
  CREATE_ORDER_DOCUMENTS_APPROVAL_FIELDS,
} from "../graphql/mutations/orderDocumentsApprovalFields";
import { getDocumentsLookupFields } from "../graphql/queries/getBookingRequestRequiredDocumentsFields";

export interface IApprovalDocumentsFields {
  title: string;
  key: string;
  value: boolean;
  __typename?: string;
}

export const DocumentApprovalPreferences: FunctionComponent = () => {
  const classes = useStyles();
  const client = useApolloClient();
  const user = useReactiveVar(userById);
  const orgId = user?.org?.id;
  const [errorMsg, setMsg] = useState("");
  const alertRef = useRef(null);
  const [canEdit, setCanEdit] = useState(false);
  const [documentsApprovalFields, setDocumentsApprovalFields] =
    useState<IApprovalDocumentsFields[]>();
  const [documentsFieldsStored, setDocumentsStoredFields] =
    useState<IApprovalDocumentsFields[]>();
  const [modalOpened, setModalOpened] = useState(false);
  const [editOrderApprovalDocumentsMutation] = useMutation(
    EDIT_ORDER_DOCUMENTS_APPROVAL_FIELDS
  );
  const [createOrderApprovalDocumentsMutation] = useMutation(
    CREATE_ORDER_DOCUMENTS_APPROVAL_FIELDS
  );

  useEffect(() => {
    if (!orgId) return;
    getDocumentsFields(client, orgId);
  }, [orgId]);

  useEffect(() => {
    if (modalOpened && orgId) {
      setDocumentsApprovalFields(cloneDeep(documentsFieldsStored));
    }
  }, [modalOpened]);

  const getDocumentsFields = async (client, orgId) => {
    const { data, errors } = await getDocumentsApprovalFields(client, {
      orgId,
    });
    if (data && data?.orderDocumentsApprovalFields?.fields) {
      setCanEdit(true);
      try {
        const documentsApprovalFields =
          data.orderDocumentsApprovalFields.fields;
        const approvalFields = cloneDeep(documentsApprovalFields);
        setDocumentsApprovalFields(approvalFields);
        setDocumentsStoredFields(approvalFields);
      } catch (error) {
        console.log("error...");
      }
    } else {
      const { data: documentLookupFields, errors } =
        await getDocumentsLookupFields(client);
      let defaultFields: IApprovalDocumentsFields[] = [];
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
      setDocumentsApprovalFields(cloneDeep(defaultFields));
      setDocumentsStoredFields(cloneDeep(defaultFields));
    }
  };

  const onChangeCheckbox = (
    checked: boolean,
    field: { key: string; value: boolean }
  ) => {
    const newDocumentsApprovalFields = documentsApprovalFields.map(
      (orgField) => {
        if (orgField.key === field.key) {
          orgField.value = checked;
        }
        return orgField;
      }
    );
    setDocumentsApprovalFields(newDocumentsApprovalFields);
  };

  const setAllFieldsValues = (value: boolean) => {
    const newDocuments = documentsApprovalFields.map((docField) => {
      docField.value = value;
      return docField;
    });
    setDocumentsApprovalFields(newDocuments);
  };

  const saveFields = async () => {
    try {
      if (canEdit) {
        await editFields();
      } else {
        await createFields();
      }
      setDocumentsStoredFields(cloneDeep(documentsApprovalFields));
      setModalOpened(false);
    } catch (error) {
      setMsg("Error while saving preferences."); // TODO: translate
      alertRef.current.open();
    }
  };

  const editFields = async () => {
    const _documentFields = [];
    documentsApprovalFields.forEach((doc) => {
      const { __typename, ...rest } = doc;
      _documentFields.push(rest);
    });
    await editOrderApprovalDocumentsMutation({
      client,
      variables: {
        input: { fields: _documentFields },
      },
    });
  };

  const createFields = async () => {
    await createOrderApprovalDocumentsMutation({
      client,
      variables: {
        input: { fields: documentsApprovalFields },
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
                  Selected document types will require an approve or deny choice
                  in the documents area of a PO before Booking
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
                    {documentsApprovalFields &&
                      documentsApprovalFields?.map((field) => {
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
      maxWidth: "655px",
      overflowY: "scroll",
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
