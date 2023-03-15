import * as React from "react";
import { FunctionComponent, useCallback, useMemo, useState, useRef } from "react";
import MaterialTable from "@material-table/core";
import { MaterialTableIcons } from "../common/material-config";
import { useApolloClient, useReactiveVar } from "@apollo/client";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import { Color } from "@material-ui/lab/Alert";
import Card from "@material-ui/core/Card";
import EditIcon from "@material-ui/icons/Edit";
import DoneIcon from "@material-ui/icons/Done";
import RefreshIcon from "@material-ui/icons/Refresh";
import { userById } from "react/graphql/queries/userQueries";
import { LocationListActionButtons } from "./locations-list-action-buttons";
import { LocationAddDialog } from "./location-add-dialog";
import { MercadoAlert } from "react/common/components/mercadoAlert";
import { getLocations } from "react/graphql/queries/locationQueries";
import { mapDataForTable } from "./locations-data-fields-map";
import { useLayoutType } from "../common/utils";
import { useOnWindowResize } from "../common/resizeHook";
import { updateLocation } from "../graphql/mutations/locationMutations";
import { globalHeaderStyle, stripedRows } from "../common/table-utils";
import { withTableSearch } from "react/common/components/tableSearch";
import { styles } from "react/common/components/styles";

export interface LocationListProps {
  title?: string;
  prefsPage?: string;
}
export const Locations: FunctionComponent<LocationListProps> = (
  props: LocationListProps,
) => {
  const {
    title = "Company Locations",
    prefsPage = "locationList",
  } = props;

  const classes = useStyles();
  const styleClasses = styles();
  const client = useApolloClient();
  const user = useReactiveVar(userById);
  const dimensions = useOnWindowResize();
  const layoutType = useLayoutType(dimensions);
  const _pageSize = user.preferences?.[prefsPage]?.[layoutType]?.pageSize ?? 10;
  const orderByKey = user.preferences?.[prefsPage]?.[layoutType]?.orderByKey;
  const orderByValue = user.preferences?.[prefsPage]?.[layoutType]?.orderByValue;
  const [pageSize, setPageSize] = useState(_pageSize);
  const [selectedRow, setSelectedRow] = useState(null);
  const [editableRow, setEditableRow] = useState({});
  const [errorMsg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [locations, setLocation] = useState([]);
  const [severity, setSeverity] = useState("success");
  const fetchPolicy = useRef(null);
  const tableRef = useRef(null);
  const dialogRef = useRef(null);
  const alertRef = useRef(null);
  const [searchText, setSearchText] = useState("");

  const queryData = async query => {
    setLoading(true);
    const data = await getLocations(client, {
      first: query.pageSize,
      after: query.page * query.pageSize,
      orderByKey: query.orderBy?.field?.toUpperCase() || orderByKey || "NAME",
      orderByValue: query.orderDirection?.toUpperCase() || orderByValue || "DESC",
      search: query.search,
    }, fetchPolicy.current);
    fetchPolicy.current = null;
    setLoading(false);
    setLocation(mapDataForTable(data));
    return {
      data: mapDataForTable(data),
      page: query.page,
      totalCount: data?.locations?.totalCount ?? 0,
    };
  };

  const onRowsPerPageChange = pgSize => {
    setPageSize(pgSize);
  };

  const columns = [
    { title: "Name", field: "name" },
    { title: "Address", field: "fulladdress" },
    { title: "Type", field: "locationTypeValue" },
    {
      title: "Consolidation Location",
      field: "consolidationLocation",
      render: rowData => (rowData.isConsolidationLocation ? <DoneIcon /> : ""),
    },
    {
      title: "Pickup Location",
      field: "pickupLocation",
      render: rowData => (rowData.isPickupLocation ? <DoneIcon /> : ""),
    },
    { title: "Location Identifier", field: "externalIdentifier" },
  ];

  const handleClickOpen = rowData => {
    setEditableRow(rowData);
    dialogRef.current.open();
  };

  async function onRowDelete(row) {
    if (!row.isDefault) {
      const { errors } = await updateLocation({
        client,
        variables: {
          locationId: row.id,
          isActive: false,
        },
      });
      if (errors) {
        setSeverity("error");
        setMsg("Unable to delete location");  // ToDo: translate
        alertRef.current.open();
      }
      else {
        setSeverity("success");
        setMsg("Location deleted");
        alertRef.current.open();
        onRefetch();
      }
    }
    else {
      setSeverity("error");
      setMsg("Cannot delete your Default Location");
      alertRef.current.open();
    }
  }
  const onRefetch = () => {
    setSearchText("");
    fetchPolicy.current = "network-only";
    tableRef.current.onQueryChange();
  };

  const searchHandler = useCallback(text => {
    fetchPolicy.current = "no-cache";
    tableRef.current.onSearchChangeDebounce(text);
    setSearchText(text);
  }, []);

  const components = useMemo(() => ({
    Toolbar: withTableSearch(searchHandler, searchText),
  }), [searchHandler, searchText]);

  return (
    <div className={styleClasses.tabelTitle}>
      <Card className={classes.card}>
        <LocationListActionButtons
          onRefetch={onRefetch}
          locations={locations}
        />
        <MaterialTable
          title={title}
          icons={MaterialTableIcons}
          columns={columns}
          data={queryData}
          isLoading={loading}
          onRowClick={((evt, _selectedRow) => setSelectedRow(_selectedRow.tableData.id))}
          onRowsPerPageChange={onRowsPerPageChange}
          actions={[
            {
              icon: () => <EditIcon />,
              tooltip: "Edit",
              onClick: (event, rowData) => handleClickOpen(rowData),
            },
            {
              icon: () => <RefreshIcon color="primary" />,
              tooltip: "Refresh",
              isFreeAction: true,
              onClick: onRefetch,
            },
          ]}
          editable={{
            onRowDelete,
          }}
          options={{
            search: false,
            pageSize,
            pageSizeOptions: [5, 10, 20, 30, 40, 50],
            rowStyle: (data, index) => stripedRows(data, index, selectedRow),
            columnsButton: true,
            headerStyle: globalHeaderStyle,
            emptyRowsWhenPaging: false,
          }}
          localization={{
            header: {
              actions: "",
            },
          }}
          tableRef={tableRef}
          components={components}
        />
      </Card>

      <LocationAddDialog
        title="Edit Location"
        location={editableRow}
        onSuccess={onRefetch}
        ref={dialogRef}
      />
      <MercadoAlert
        severity={severity as Color}
        ref={alertRef}
        message={errorMsg}
      />
    </div>
  );
};
const useStyles = makeStyles(() => createStyles({
  container: {
  },
  card: {
    marginBottom: "1rem",
  },
  iconSize: {
    fontSize: "3.5rem",
  },
  buttonSpacing: {
    margin: "0 1rem 0 1rem",
  },
}));
