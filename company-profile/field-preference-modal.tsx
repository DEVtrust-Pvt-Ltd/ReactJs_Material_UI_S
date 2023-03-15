import {
  useLazyQuery,
  MutationFunctionOptions,
  OperationVariables,
  DefaultContext,
  ApolloCache,
  FetchResult,
  useReactiveVar,
} from "@apollo/client";
import {
  Button,
  Card,
  Checkbox,
  FormControlLabel,
  Grid,
  makeStyles,
  Modal,
  Typography,
} from "@material-ui/core";
import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { GET_PREFERENCES_BY_COMPANY_ID } from "react/graphql/queries/companyQueries";
import { userById } from "react/graphql/queries/userQueries";

import { GET_ORDER_CONFIG } from "../graphql/queries/ordersQueries";

export type FieldPreferenceContext = "orderHeader" | "orderLineItem";

export interface FieldPreferenceModalProps {
  alertRef: React.MutableRefObject<any>;
  closeModal: () => void;
  context: FieldPreferenceContext;
  open: boolean;
  preferences: any;
  setErrorMsg: React.Dispatch<React.SetStateAction<string>>;
  updateOrgPreferences: (
    options?: MutationFunctionOptions<
      any,
      OperationVariables,
      DefaultContext,
      ApolloCache<any>
    >
  ) => Promise<FetchResult<any>>;
}

export const FieldPreferenceModal: FunctionComponent<
  FieldPreferenceModalProps
> = (props) => {
  const {
    alertRef,
    closeModal,
    context,
    open,
    preferences,
    setErrorMsg,
    updateOrgPreferences,
  } = props;

  const user = useReactiveVar(userById);

  const [originalFields, setOriginalFields] = useState([]);
  const [form, setForm] = useState([]);
  const [leftForm, setLeftForm] = useState([]);
  const [rightForm, setRightForm] = useState([]);

  const [
    fetchOrderConfig,
    { data: orderData, loading: orderLoading, error: orderError },
  ] = useLazyQuery(GET_ORDER_CONFIG);

  const classes = useStyles();

  useEffect(() => {
    switch (context) {
      case "orderHeader":
      case "orderLineItem":
        fetchOrderConfig({
          variables: {
            action: "CREATE",
          },
        });
        break;
    }
  }, [context, fetchOrderConfig]);

  useEffect(() => {
    if (orderData && !orderLoading) {
      let filteredFields;
      let fieldPrefs;
      switch (context) {
        case "orderHeader":
          filteredFields = orderData.orderConfigurationFields?.headerFields
            ?.filter(
              (f) =>
                (f.isConfigurable == null || f.isConfigurable !== false) &&
                !f.required
            )
            .sort((a, b) => {
              if (a.readKey > b.readKey) {
                return 1;
              } else if (a.readKey < b.readKey) {
                return -1;
              }
              return 0;
            });
          fieldPrefs = preferences?.purchaseOrder?.headerFields;
          break;
        case "orderLineItem":
          filteredFields = orderData.orderConfigurationFields?.lineItemFields
            ?.filter(
              (f) =>
                (f.isConfigurable == null || f.isConfigurable !== false) &&
                !f.required
            )
            .sort((a, b) => {
              if (a.readKey > b.readKey) {
                return 1;
              } else if (a.readKey < b.readKey) {
                return -1;
              }
              return 0;
            });
          fieldPrefs = preferences?.purchaseOrder?.lineItemFields;
          break;
      }
      setOriginalFields(
        filteredFields.map((f) => {
          const pref = fieldPrefs ? fieldPrefs[f.readKey] : null;
          let displayable = f.displayable;
          if (pref && pref.displayable != null) {
            displayable = pref.displayable;
          } else if (displayable == null) {
            displayable = true;
          }
          return {
            ...f,
            displayable,
          };
        })
      );
    }
  }, [context, orderData, orderLoading, preferences]);

  useEffect(() => {
    setLeftForm(
      form.slice(0, form.length / 2 + (form.length % 2 === 0 ? 0 : 1))
    );
    setRightForm(form.slice(form.length / 2 + (form.length % 2 === 0 ? 0 : 1)));
  }, [form]);

  useEffect(() => {
    if (originalFields.length > 0) {
      setForm(originalFields);
    }
  }, [originalFields]);

  useEffect(() => {
    if (orderError) {
      setErrorMsg("There was an error fetching the fields.");
      closeModal();
      alertRef.current.open();
    }
  }, [alertRef, closeModal, setErrorMsg, orderError]);

  const descriptionText = useMemo(() => {
    let text = "";
    switch (context) {
      case "orderHeader":
        text =
          "Selected fields will be displayed in the Details area of the Purchase Order tab";
        break;
      case "orderLineItem":
        text =
          "Select fields will be displayed in the Line Items section of the Purchase Order tab";
        break;
    }
    return text;
  }, [context]);

  const formLabelClasses = useMemo(
    () => ({
      root: classes.formLabel,
    }),
    [classes.formLabel]
  );

  const onChange = useCallback(
    (event) => {
      const id = event.target.id?.slice(3); // element id  = cb_<readKey>
      setForm((prevForm) => {
        const index = prevForm.findIndex((f) => f.readKey === id);
        if (index > -1) {
          const newForm = [...prevForm]; // Get a new reference
          // Prevent typeError: "displayable" is read-only
          newForm[index] = {
            ...newForm[index],
            displayable: !newForm[index].displayable,
          };
          return newForm;
        } else {
          setErrorMsg("An error occurred when editing the form");
          closeModal();
          alertRef.current.open();
          return prevForm; // same reference, no change
        }
      });
    },
    [alertRef, closeModal, setErrorMsg]
  );

  const selectAll = useCallback(() => {
    setForm((prevForm) => prevForm.map((f) => ({ ...f, displayable: true })));
  }, []);

  const deselectAll = useCallback(() => {
    setForm((prevForm) => prevForm.map((f) => ({ ...f, displayable: false })));
  }, []);

  const saveFields = useCallback(
    async (e) => {
      e.preventDefault();
      // Check if anything changed
      const update = {};
      form.forEach((field) => {
        const oField = originalFields.find((f) => f.readKey === field.readKey);
        if (oField?.displayable !== field.displayable) {
          update[field.readKey] = { displayable: field.displayable };
        }
      });

      // I'm not simplifying the logic around closing the modal here
      // because I want to make sure if there's an error that the modal
      // closes before the alert is displayed
      if (Object.keys(update).length > 0) {
        let mutation;
        switch (context) {
          case "orderHeader":
            mutation = {
              preferences: {
                purchaseOrder: {
                  headerFields: { ...update },
                },
              },
            };
            break;
          case "orderLineItem":
            mutation = {
              preferences: {
                purchaseOrder: {
                  lineItemFields: { ...update },
                },
              },
            };
            break;
        }
        if (!mutation) {
          setErrorMsg("An error occurred while saving the field preferences");
          closeModal();
          alertRef.current.open();
          return;
        }
        const { errors } = await updateOrgPreferences({
          variables: mutation,
          refetchQueries: [
            {
              query: GET_PREFERENCES_BY_COMPANY_ID,
              variables: {
                orgId: user?.org?.id,
              },
            },
          ],
        });
        if (errors) {
          setErrorMsg("An error occurred while saving the field preferences");
          closeModal();
          alertRef.current.open();
        } else {
          closeModal();
        }
      } else {
        closeModal();
      }
    },
    [
      alertRef,
      closeModal,
      context,
      form,
      originalFields,
      setErrorMsg,
      updateOrgPreferences,
      user,
    ]
  );

  const onCancel = useCallback(() => {
    setForm(originalFields);
    closeModal();
  }, [closeModal, originalFields]);

  return (
    <Modal open={open} onClose={closeModal}>
      <form onSubmit={saveFields} style={{ width: "100%", height: "100%" }}>
        <div className={classes.flexCenter}>
          <Card className={classes.card}>
            <Typography
              variant="subtitle1"
              className={classes.description}
              align="center"
            >
              {descriptionText}
            </Typography>
            <Grid
              container
              justifyContent="space-around"
              className={classes.selectContainer}
            >
              <Button variant="text" onClick={selectAll} color="secondary">
                SELECT ALL
              </Button>
              <Button variant="text" onClick={deselectAll} color="secondary">
                DESELECT ALL
              </Button>
            </Grid>
            <Grid
              container
              className={classes.fieldsContainer}
              wrap="wrap"
              spacing={2}
            >
              <Grid container item xs={12} sm={6} direction="column">
                {leftForm.map((f, index) => (
                  <Grid className={classes.fieldItem} item key={index}>
                    <FormControlLabel
                      classes={formLabelClasses}
                      label={f.title}
                      labelPlacement="start"
                      control={
                        <Checkbox
                          id={`cb_${f.readKey}`}
                          className={classes.checkbox}
                          checked={f.displayable}
                          onChange={onChange}
                        />
                      }
                    />
                  </Grid>
                ))}
              </Grid>
              <Grid container item xs={12} sm={6} direction="column">
                {rightForm.map((f, index) => (
                  <Grid className={classes.fieldItem} item key={index}>
                    <FormControlLabel
                      classes={formLabelClasses}
                      label={f.title}
                      labelPlacement="start"
                      control={
                        <Checkbox
                          id={`cb_${f.readKey}`}
                          className={classes.checkbox}
                          checked={f.displayable}
                          onChange={onChange}
                        />
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid
              container
              justifyContent="flex-end"
              wrap={"nowrap"}
              className={classes.closeContainer}
            >
              <Button
                onClick={onCancel}
                color="secondary"
                variant="contained"
                className={classes.closeButtons}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                color="secondary"
                variant="contained"
                className={classes.closeButtons}
              >
                Save
              </Button>
            </Grid>
          </Card>
        </div>
      </form>
    </Modal>
  );
};

FieldPreferenceModal.displayName = "FieldPreferenceModal";

const useStyles = makeStyles((theme) => ({
  card: {
    border: "none",
    boxShadow: "none",
    height: "80vh",
    padding: 16,
    [theme.breakpoints.down("sm")]: {
      maxWidth: "80vw",
    },
    [theme.breakpoints.between("md", "lg")]: {
      maxWidth: "50vw",
    },
    [theme.breakpoints.up("xl")]: {
      maxWidth: "40vw",
    },
  },
  checkbox: {
    marginLeft: 8,
    padding: 0,
  },
  closeButtons: {
    marginLeft: 4,
    marginRight: 4,
  },
  closeContainer: {
    marginTop: 24,
  },
  description: {
    fontWeight: "bold",
  },
  fieldsContainer: {
    "@media (max-width: 371px)": {
      height: "calc(80vh - 221px)",
    },
    "@media (min-width: 372px) and (max-width: 702px)": {
      height: "calc(80vh - 196px)",
    },
    "@media (min-width: 703px)": {
      height: "calc(80vh - 171px)",
    },
    overflowY: "scroll",
  },
  fieldItem: {
    paddingTop: "8px !important",
    paddingBottom: "8px !important",
  },
  formLabel: {
    display: "flex",
    justifyContent: "space-between",
    margin: 0,
  },
  flexCenter: {
    alignItems: "center",
    display: "flex",
    height: "100%",
    justifyContent: "center",
  },
  selectContainer: {
    marginBottom: 24,
    marginTop: 16,
  },
}));
