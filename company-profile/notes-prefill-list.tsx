import { useApolloClient, useReactiveVar } from "@apollo/client";
import MaterialTable, { Column } from "@material-table/core";
import { Button, Card, DialogActions, Modal } from "@material-ui/core";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import Edit from "@material-ui/icons/Edit";
import * as React from "react";
import { FunctionComponent, useEffect, useRef, useState } from "react";
import { LoadingSkeleton } from "react/common/components/loadingSkeleton";
import { MercadoAlert } from "react/common/components/mercadoAlert";
import { getNotesPrefillOptions } from "../graphql/queries/notesPrefillOptions";
import { userById } from "react/graphql/queries/userQueries";
import { mapDataForTable } from "./notes-prefill-data-fields-map";
import { updateNotesPrefillOptions } from "../graphql/mutations/prefillOptions";
import { Color } from "@material-ui/lab/Alert";

export const NotesPrefillOptionsList: FunctionComponent = () => {
  const classes = useStyles();
  const client = useApolloClient();
  const user = useReactiveVar(userById);
  const orgId = user?.org?.id;
  const [errorMsg, setMsg] = useState("");
  const alertRef = useRef(null);
  const [isLoading, setLoading] = useState(true);
  const [notesPrefillOptions, setNotesPrefillOptions] = useState([]);
  const [modalOpened, setModalOpened] = useState(false);
  const fetchPolicy = useRef(null);
  const [severity, setSeverity] = useState("success");
  const columns: Column<any>[] = [
    {
      field: "value",
      validate: (rowData) => {
        if (rowData.value === undefined || rowData.value.trim() === "") {
          return "Field is required";
        } else if (rowData.value.trim().length > 75) {
          return "Description cannot have more than 75 characters";
        }
        return true;
      },
    },
  ];
  useEffect(() => {
    if (!orgId) return;
    getFields(client, orgId);
  }, [orgId]);
  const getFields = async (client, orgId) => {
    setLoading(true);
    const data = await getNotesPrefillOptions(
      client,
      {
        orgId,
      },
      fetchPolicy.current
    );
    fetchPolicy.current = null;
    setLoading(false);
    setNotesPrefillOptions(mapDataForTable(data));
  };

  const onRefetch = () => {
    fetchPolicy.current = "network-only";
    getFields(client, orgId);
  };

  async function onRowDelete(selectedRow) {
    const notes = notesPrefillOptions.filter((option) => {
      if (option.id !== selectedRow.tableData.id) return option;
    });
    const { errors } = await updateNotesPrefillOptions({
      client,
      variables: {
        input: { orgId, notes },
      },
    });
    if (errors) {
      setSeverity("error");
      setMsg("Unable to delete prefill option"); // ToDo: translate
      alertRef.current.open();
    } else {
      setSeverity("success");
      setMsg("Prefill option deleted");
      alertRef.current.open();
      onRefetch();
    }
  }
  async function onRowAdd(row) {
    let max = 0;
    notesPrefillOptions?.forEach((option) => {
      if (max < option.id) {
        max = option.id;
      }
    });
    const notes = [...notesPrefillOptions, { id: max + 1, ...row }];
    const { errors } = await updateNotesPrefillOptions({
      client,
      variables: {
        input: { orgId, notes },
      },
    });
    if (errors) {
      setSeverity("error");
      setMsg("Unable to add prefill option"); // ToDo: translate
      alertRef.current.open();
    } else {
      setSeverity("success");
      setMsg("Prefill option added");
      alertRef.current.open();
      onRefetch();
    }
  }
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
        <Card className={classes.card}>
          <h3>New and deleted entries do not change existing Notes.</h3>
          <h3>
            Changes here are available immediately in the Notes Prefill list of
            a Notes body for new and edited events.
          </h3>
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <>
              <MaterialTable
                title={"Notes Prefill List Entries"}
                columns={columns}
                data={notesPrefillOptions}
                isLoading={isLoading}
                options={{
                  search: false,
                  addRowPosition: "first",
                  paging: false,
                  minBodyHeight: "40vh",
                  maxBodyHeight: "40vh",
                }}
                editable={{
                  onRowAdd,
                  onRowDelete,
                }}
                localization={{
                  header: {
                    actions: "",
                  },
                }}
              />
              <DialogActions>
                <Button
                  className={classes.buttonColor}
                  onClick={() => setModalOpened(false)}
                >
                  Done
                </Button>
              </DialogActions>
            </>
          )}
        </Card>
      </Modal>
      <MercadoAlert
        ref={alertRef}
        message={errorMsg}
        severity={severity as Color}
      />
    </>
  );
};

const useStyles = makeStyles((theme) =>
  createStyles({
    card: {
      border: "none",
      boxShadow: "none",
      overflow: "hidden",
      maxWidth: "510px",
      marginTop: "5%",
      margin: "auto",
      position: "relative",
      padding: "40px 0",
      borderRadius: "0",
      "&:focus-visible": {
        outline: "0",
      },
      "& h3": {
        fontSize: "13px",
        fontWeight: "500",
        lineHeight: "1.5",
        padding: "0 40px",
        margin: "15px 0 0",
      },
      "& .MuiPaper-elevation2": {
        boxShadow: "none",
        paddingLeft: "40px",
        paddingRight: "40px",
        "& .MuiTableCell-body": {
          padding: "7px",
        },
        "& .MuiTableCell-head": {
          display: "none",
        },
        "& .MuiTypography-h6": {
          left: "145px",
          fontSize: "13px",
          fontWeight: "400",
          top: "22px",
        },
        "& .MuiToolbar-regular": {
          paddingRight: "0",
          position: "relative",
          right: "-5px",
          minHeight: "54px",
        },
      },
    },
    flexCenter: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    buttonColor: {
      backgroundColor: "#1ab394",
      borderColor: "#1ab394",
      marginRight: "34px",
      marginTop: "40px",
      color: "white",
      "&:hover, &:focus": {
        backgroundColor: "#1ab394",
      },
    },
  })
);
