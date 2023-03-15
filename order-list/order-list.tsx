import * as React from "react";
import { FunctionComponent, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import Grid from "@material-ui/core/Grid";
import Skeleton from "@material-ui/lab/Skeleton";
import IconButton from "@material-ui/core/IconButton";
import RefreshIcon from "@material-ui/icons/Refresh";
import CheckBoxOutlineBlankIcon from "@material-ui/icons/CheckBoxOutlineBlank";
import CheckBoxIcon from "@material-ui/icons/CheckBox";
import IndeterminateCheckBoxIcon from "@material-ui/icons/IndeterminateCheckBox";
import MaterialTable from "@material-table/core";
import { MaterialTableIcons, MercadoColors } from "../common/material-config";
import { useApolloClient, useReactiveVar } from "@apollo/client";
import { userById } from "../graphql/queries/userQueries";
import { updateUserPreferences } from "../graphql/mutations/preferencesMutations";
import { getOrders, getOrdersWithLineItems } from "../graphql/queries/ordersQueries";
import { OrderListActionButtons } from "./order-list-action-buttons";
import { cellStyles } from "react/common/components/cellRenderers";
import { useLayoutType, updateLocalStoragePages, checkPageSize, checkInitialPage } from "../common/utils";
import { useOnWindowResize } from "../common/resizeHook";
import {
  onOrderChange, onColumnDragged, onChangeColumnHidden, stripedRows, globalHeaderStyle,
  mapDataForTable,
} from "../common/table-utils";
import isEmpty from "lodash/isEmpty";
import { useOrderConfiguration } from "../order-details/order-utils";
import { withTableSearch } from "react/common/components/tableSearch";
import { styles } from "react/common/components/styles";

export interface IOrderListProps {
  title?: string;
  prefsPage?: string;
  enableLinks?: boolean;
  showToolbar?: boolean;
  showDetailPanel?: boolean;
  showOnlyBookable?: boolean;
  selectMode?: "order" | "lineItem";
  onLineItemsSelect?: Function;
  selectedLineItems?: any[];
  isBusy?: boolean;
  // eslint-disable-next-line no-unused-vars
  navigate?: (route: string) => void,
  // deferPrefsUpdate prevents writing to user preferences until the component
  // is unmounted.
  // In a modal, modifying the user reactive var triggers a re-render in the
  // parent that destroys its contents and resets state.
  deferPrefsUpdate?: boolean;
}

export const OrderList: FunctionComponent<IOrderListProps> = (
  props: IOrderListProps,
) => {
  const {
    title = "Purchase Orders",
    prefsPage = "orderList",
    enableLinks = true,
    showToolbar = true,
    showDetailPanel = false,
    showOnlyBookable,
    selectMode,
    onLineItemsSelect: propsOnLineItemsSelect = () => { },
    selectedLineItems: propsSelectedLineItems = [],
    isBusy,
    navigate,
    deferPrefsUpdate,
  } = props;
  const user = useReactiveVar(userById);
  const classes = useStyles();
  const styleClasses = styles();
  const cellClasses = cellStyles();
  const client = useApolloClient(); // For imperative calls used by material-table remote data
  const dimensions = useOnWindowResize();
  const layoutType = useLayoutType(dimensions);
  const preferences = user.preferences;
  const _pageSize = useMemo(() => checkPageSize("PurchaseOrder", user.preferences?.[prefsPage]?.[layoutType]?.pageSize),
    [user.preferences?.[prefsPage]?.[layoutType]?.pageSize]);
  const initialPage = useMemo(() => checkInitialPage("PurchaseOrder"), []);
  const orderByKey = user.preferences?.[prefsPage]?.[layoutType]?.orderByKey;
  const orderByValue = user.preferences?.[prefsPage]?.[layoutType]?.orderByValue;
  const columnOrderPrefs = user.preferences?.[prefsPage]?.[layoutType]?.columnOrder;
  const [orders, setOrders] = useState([]);
  const [pageSize, setPageSize] = useState(_pageSize);
  const [selectedRow, setSelectedRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userInitialized, setUserInitialized] = useState(false);
  const fetchPolicy = useRef(null);
  const tableRef = useRef(null);
  const preferencesUpdate = useRef({});
  const selectedLineItems = useRef(propsSelectedLineItems);
  const [searchText, setSearchText] = useState("");
  const {
    lineItemFields: lineItemConfig,
    lineItemListFields: lineItemListConfig,
    listFields: columns,
    listFieldsColumnOrder: columnOrder,
  } = useOrderConfiguration({
    action: "CREATE",
    cellClasses,
    classes,
    columnOrder: columnOrderPrefs,
    enableLinks,
    configType: selectMode ? "orderListWithLineItem" : "orderList",
    layoutType,
    // eslint-disable-next-line no-unused-vars
    navigate,
    orderId: null,
    preferences,
    prefsPage,
  });

  useEffect(() => {
    // Must wait for user to be initialized so pageSize etc is correct.
    setUserInitialized(user.id !== 0);
    setPageSize(_pageSize);
  }, [user, layoutType]);

  useEffect(() => {
    // Ref needed for render detail panel to see latest values.
    selectedLineItems.current = propsSelectedLineItems;
  }, [propsSelectedLineItems]);

  useEffect(() => () => {
    // Save preferences on unmount --
    if (deferPrefsUpdate && !isEmpty(preferencesUpdate.current)) {
      updateUserPreferences({
        client, page: prefsPage, layoutType, mergeObj: preferencesUpdate.current,
      });
    }
  }, []);

  const queryData = useCallback(async query => {
    updateLocalStoragePages(query, "PurchaseOrder");
    query.search = searchText;
    setLoading(true);
    setSelectedRow(null);
    const getOrdersFunc = selectMode ? getOrdersWithLineItems : getOrders;
    const data = await getOrdersFunc(client,
      {
        first: query.pageSize,
        after: query.page * query.pageSize,
        orderByKey: query.orderBy?.field || orderByKey || "CREATED_DATE",
        orderByValue: query.orderDirection?.toUpperCase() || orderByValue || "DESC",
        search: query.search,
        filters: showOnlyBookable ? ["READY_FOR_BOOKING"] : null,
      },
      fetchPolicy.current,
    );
    fetchPolicy.current = null;
    setLoading(false);
    const currentOrders = data?.orders?.edges;
    setOrders(currentOrders);
    return {
      data: mapDataForTable(currentOrders, columns),
      page: query.page,
      totalCount: data?.orders?.totalCount ?? 0,
    };
  }, [searchText, client, orderByKey, orderByValue, showOnlyBookable, columns, selectMode]);

  const onRefetch = useCallback(() => {
    setSearchText("");
    fetchPolicy.current = "network-only";
    tableRef.current.onQueryChange();
  }, []);

  const savePrefs = useCallback(mergeObj => {
    if (deferPrefsUpdate) {
      preferencesUpdate.current = {
        ...preferencesUpdate.current,
        ...mergeObj,
      };
    }
    else {
      // user update flows back in to update this component
      updateUserPreferences({ client, page: prefsPage, layoutType, mergeObj });
    }
  }, [deferPrefsUpdate, client, prefsPage, layoutType]);

  const onRowsPerPageChange = useCallback(pgSize => {
    savePrefs({ pageSize: pgSize });
    if (deferPrefsUpdate) {
      // When deferring prefs update, pageSize state must be updated because
      // the user reactive var isn't updated immediately.
      setPageSize(pgSize);
    }
  }, [deferPrefsUpdate]);

  const generateActions = useCallback(() => {
    const actions = [
      {
        icon: () => <RefreshIcon color="primary" />,
        tooltip: "Refresh",
        isFreeAction: true,
        onClick: onRefetch,
      },
    ] as any;

    if (selectMode) {
      actions.push(rowData => ({
        icon: () => {
          // Determine whether all or partial line items for an order are selected.
          const order = orders.find(o => o?.node?.id === rowData.id);
          const numOrderLineItems = order?.node?.lineItems?.edges?.length;
          const orderSelectedLI = selectedLineItems.current.filter(li => li.orderId === rowData.id || li.order?.id === rowData.id);

          if (orderSelectedLI.length === numOrderLineItems) {
            return (<CheckBoxIcon color="secondary" data-testid="lineItemSelectedIcon" />);
          }
          if (orderSelectedLI.length) {
            return (
              <IndeterminateCheckBoxIcon
                color="secondary"
                data-testid="lineItemPartialSelectedIcon"
              />
            );
          }
          return (
            <CheckBoxOutlineBlankIcon color="primary" data-testid="lineItemUnselectedIcon" />
          );
        },
        tooltip: "Add Order",
        onClick: () => {
          const isSelected = !selectedLineItems.current.find(li => li.orderId === rowData.id || li.order?.id === rowData.id);
          const order = orders.find(o => o?.node?.id === rowData.id);
          return propsOnLineItemsSelect(
            order?.node?.lineItems?.edges?.map((li) => li.node),
            [order?.node],
            isSelected,
            orders,
          );
        },
      }));
    }
    return actions;
  }, [orders, onRefetch, selectMode, propsOnLineItemsSelect]);

  const lineItemSelectHandler = useCallback((lineItem, orderId) => {
    const isSelected = !selectedLineItems.current.find(li => li.id === lineItem.id || li.orderLineItem?.id === lineItem.id);
    const order = orders.find(o => o?.node?.id === orderId);
    return propsOnLineItemsSelect([lineItem], [order?.node], isSelected);
  }, [orders, propsOnLineItemsSelect]);

  const renderLineItemsDetailPanel = useCallback(({ rowData }) => {
    // Show/hide line item fields based on order config prefs.
    const _reducedFieldList = lineItemListConfig.filter(lc => lc?.displayable);
    const lineItems = rowData.LINE_ITEMS?.edges?.map(li => li.node)
      .sort((a, b) => +a.lineNumber - +b.lineNumber);
    const lines = lineItems?.map(lineItem => (
      <Grid container spacing={0}>
        <Grid container item key={lineItem.id} className={classes.rowDetailCell} xs>
          <div className={classes.lineItemButtonContainer}>
            <IconButton
              aria-label="Line Item select"
              onClick={() => lineItemSelectHandler(lineItem, rowData.id)}
              className={classes.lineItemButton}
            >
              {/* selectedLineItems may hold existing fulfillmentLineItems or newly
              added order line items */}
              {selectedLineItems.current.find(li => (li.lineItem || li.orderLineItem || li).id === lineItem.id) ?
                <CheckBoxIcon color="secondary" /> :
                <CheckBoxOutlineBlankIcon color="primary" />
              }
            </IconButton>
          </div>
        </Grid>
        {_reducedFieldList.map(f => (
          <Grid container item key={f.readKey} className={classes.rowDetailCell} xs>
            <Typography className={classes.rowDetailLineItemValue} color="primary">
              {f.formatter(lineItem[f.readKey])}
            </Typography>
          </Grid>
        ))}
      </Grid>
    ));

    return (
      <div className={classes.rowDetailContainer} style={{ width: dimensions.width * 0.9 }}>
        <Grid container spacing={0}>
          <Grid container item className={classes.rowDetailCell} xs />
          {_reducedFieldList.map(f => (
            <Grid container item key={f.title} className={classes.rowDetailCell} xs>
              <Typography className={classes.rowDetailHeader} color="primary">
                {f.title}
              </Typography>
            </Grid>
          ))}
        </Grid>
        {lines}
      </div>
    );
  }, [classes, lineItemConfig, lineItemSelectHandler]);

  const renderDetailPanel = useCallback(({ rowData }) => {
    if (selectMode) {
      return renderLineItemsDetailPanel({ rowData });
    }
    const fields = [];
    Object.keys(rowData).forEach(key => {
      if (key === "tableData" || key === "id") return;
      const { formatter, title: fieldTitle } = columns.find(f => f.readKey === key);
      if (!formatter) return;
      const value = formatter(rowData[key]);
      fields.push((
        <Grid container item xs={12} sm={6} md={4} key={key}>
          <Grid item xs={3}>
            <Typography className={classes.rowDetailKey}>
              {`${fieldTitle}: `}
            </Typography>
          </Grid>
          <Grid item xs={9}>
            <Typography className={classes.rowDetailValue}>{value}</Typography>
          </Grid>
        </Grid>
      ));
    });
    return (
      <div className={classes.rowDetailContainer} style={{ width: dimensions.width * 0.9 }}>
        <Grid container spacing={0}>
          {fields}
        </Grid>
      </div>
    );
  }, [selectMode, renderLineItemsDetailPanel, columns]);

  const searchHandler = useCallback(text => {
    tableRef.current.onSearchChangeDebounce(text);
    setSearchText(text);
  }, []);

  const components = useMemo(() => ({
    Toolbar: withTableSearch(searchHandler, searchText),
  }), [searchHandler, searchText]);

  return (
    <div className={styleClasses.tabelTitle}>
      {showToolbar && <OrderListActionButtons navigate={navigate} />}
      {!columns?.length ? (
        <>
          <Skeleton animation="wave" className={classes.skeleton} />
          <Skeleton animation="wave" className={classes.skeleton} />
          <Skeleton animation="wave" className={classes.skeleton} />
          <Skeleton animation="wave" className={classes.skeleton} />
        </>
      ) :
        (
          <MaterialTable
            title={title}
            icons={MaterialTableIcons}
            columns={columns}
            data={queryData}
            onRowClick={((evt, _selectedRow) => setSelectedRow(_selectedRow.tableData.id))}
            onRowsPerPageChange={onRowsPerPageChange}
            onOrderChange={(orderedColumnId, orderDirection) => onOrderChange(
              columns[orderedColumnId]?.field, orderDirection, prefsPage, layoutType, savePrefs,
              deferPrefsUpdate)}
            onColumnDragged={(sourceIndex, destinationIndex) => onColumnDragged(
              sourceIndex, destinationIndex, columnOrder, prefsPage, layoutType, savePrefs,
              deferPrefsUpdate)}
            onChangeColumnHidden={(column, hidden) => onChangeColumnHidden(
              column, hidden, columns, columnOrder, prefsPage, layoutType, savePrefs,
              deferPrefsUpdate)}
            detailPanel={showDetailPanel ? renderDetailPanel : undefined}
            options={{
              search: false,
              pageSize,
              pageSizeOptions: [5, 10, 20, 30, 40, 50],
              rowStyle: (data, index) => stripedRows(data, index, selectedRow),
              columnsButton: true,
              headerStyle: globalHeaderStyle,
              emptyRowsWhenPaging: false,
              initialPage,
            }}
            actions={generateActions()}
            isLoading={loading || !userInitialized || isBusy}
            tableRef={tableRef}
            components={components}
          />
        )}
    </div>
  );
};


const useStyles = makeStyles(() => createStyles({
  progress: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  rowDetailContainer: {
    margin: "2rem",
  },
  rowDetailCell: {
    flexDirection: "column",
    justifyContent: "center",
    overflow: "hidden",
  },
  rowDetailHeader: {
    fontSize: "1.2rem",
    fontWeight: 400,
    color: MercadoColors.navy,
    marginBottom: "1rem",
    textAlign: "center",
    textOverflow: "ellipsis",
    overflow: "hidden",
  },
  rowDetailKey: {
    fontSize: "1rem",
    color: MercadoColors.navy,
  },
  rowDetailValue: {
    fontSize: "1rem",
    fontWeight: 500,
    textAlign: "center",
  },
  rowDetailLineItemValue: {
    fontSize: "1rem",
    textAlign: "center",
    fontWeight: 300,
  },
  lineItemButtonContainer: {
    display: "flex",
    justifyContent: "flex-end",
  },
  lineItemButton: {
    padding: 0,
  },
  skeleton: {
    flex: 1,
    height: "10rem",
  },
}));
