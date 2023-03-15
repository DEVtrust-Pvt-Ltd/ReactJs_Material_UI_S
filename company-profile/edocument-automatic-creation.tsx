import { useApolloClient, useReactiveVar } from "@apollo/client";
import {
  Button,
  Checkbox,
  DialogActions,
  FormControlLabel,
  Modal,
} from "@material-ui/core";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import Edit from "@material-ui/icons/Edit";
import * as React from "react";
import { FunctionComponent, useEffect, useRef, useState } from "react";
import { MercadoAlert } from "react/common/components/mercadoAlert";
import { userById } from "react/graphql/queries/userQueries";
import { MercadoColors } from "../common/material-config";
import { updateOrgPreferences } from "../graphql/mutations/preferencesMutations";

export interface IRequiredDocAutomaticCreationFields {
  title: string;
  key: string;
  value: boolean;
}
export const DocAutomaticCreationPreferences: FunctionComponent = () => {
  const classes = useStyles();
  const client = useApolloClient();
  const user = useReactiveVar(userById);
  const preferences = user?.preferences;
  const [errorMsg, setMsg] = useState("");
  const alertRef = useRef(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [documentsFields, setDocumentsFields] = useState<
    IRequiredDocAutomaticCreationFields[]
  >([
    // enabled after MP-1449 will complete AC- 6.b.2
    // { title: "Importer Security Filing", key: "enableISF", value: false },
    { title: "CBP 7501", key: "enableCBP7501", value: false },
    {
      title: "Packing List",
      key: "enableAutomaticPackingListCreation",
      value: false,
    },
    {
      title: "Shipment Commercial Invoice",
      key: "enableAutomaticShipmentCommercialInvoice",
      value: false,
    },
    {
      title: "Reconciled Commercial Invoice",
      key: "enableReconciledCommercialInvoice",
      value: false,
    },
  ]);

  useEffect(() => {
    if (!preferences) return;

    const updateDoc = documentsFields.map((d) => {
      const isValid = Object.keys(preferences).includes(d.key);
      if (isValid) {
        d.value = preferences[d.key];
      }
      return d;
    });
    setDocumentsFields(updateDoc);
  }, [preferences]);

  const onChangeCheckbox = (
    checked: boolean,
    field: { key: string; value: boolean }
  ) => {
    const updateObj = documentsFields.map((f) => {
      if (f.key === field.key) {
        f.value = checked;
      }
      return f;
    });
    setDocumentsFields(updateObj);
  };

  const saveFields = async () => {
    try {
      const editedPrefsState = {};
      documentsFields.forEach((d) => {
        if (d.key != null) {
          editedPrefsState[d.key] = d.value;
        }
      });
      await updateOrgPreferences({ client, mergeObj: editedPrefsState });
      setModalOpened(false);
    } catch (error) {
      setMsg("Error while saving preferences."); // TODO: translate
      alertRef.current.open();
    }
  };

  const resetFields = async () => {
    setModalOpened(false);
    const updateDoc = documentsFields.map((d) => {
      const isValid = Object.keys(preferences).includes(d.key);
      if (isValid) {
        d.value = preferences[d.key];
      } else {
        d.value = false;
      }
      return d;
    });
    setDocumentsFields(updateDoc);
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
                <h4>Automatically created eDocuments</h4>
              </div>

              <div className={"col-lg-12 col-md-12 col-sm-12 col-xs-12"}>
                <div className={classes.minSection}>
                  <div className={"row"}>
                    {documentsFields &&
                      documentsFields?.map((field) => {
                        return (
                          <div className={"col-md-12"}>
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
                        onClick={() => resetFields()}
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
      maxWidth: "400px",
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
      marginRight: "0",
    },
    modalShipmentPreferencesWrapper: {
      backgroundColor: "white",
      height: "auto",

      padding: "25px",
      paddingRight: "0px",
      paddingLeft: "16px",
      [theme.breakpoints.down("md")]: {
        height: "auto",
      },
    },
    modalShipmentPreferencesSelectBoxItem: {
      minWidth: "100%",
      paddingLeft: "20px",
      paddingRight: "15px",
      flexFlow: "row-reverse",
      justifyContent: "space-between",
    },
    modalShipmentPreferencesSelectBox: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      marginLeft: "0",
      marginRight: "0",
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
