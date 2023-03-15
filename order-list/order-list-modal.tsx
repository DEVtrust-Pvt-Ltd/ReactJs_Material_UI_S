import * as React from "react";
import {
  forwardRef,
  useImperativeHandle,
  useState,
  useRef,
  useEffect,
} from "react";

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";

import { OrderList } from "./order-list";

export interface IOrderListModalProps {
  lineItems: any[];
  existingLineItems: any[];
  orders: any[];
  onLineItemsSelect: Function;
  actionMode?: "create" | "edit";
  selectMode?: "order" | "lineItem";
  preferencesKey?: string;
  loading?: boolean;
  isOpen: boolean;
  onClose: Function;
}

export const OrderListModal = forwardRef((props: IOrderListModalProps, ref) => {
  const {
    lineItems: propsLineItems,
    existingLineItems = [],
    orders: propsOrders = [],
    onLineItemsSelect: propsOnLineItemsSelect,
    actionMode = "create",
    selectMode = "order",
    preferencesKey = "orderList",
    loading,
    isOpen,
    onClose: propsClose,
  } = props;

  const lineItems = useRef(propsLineItems || []);
  const [orders, setOrders] = useState(propsOrders);
  const [allOrders, setAllOrders] = useState([]);

  useEffect(() => {
    // Ref needed for onLineItemsSelect to see latest values.
    if (propsLineItems) {
      lineItems.current = propsLineItems;
    }
  }, [propsLineItems]);

  const onClose = () => {
    propsOnLineItemsSelect &&
      propsOnLineItemsSelect({
        orderLineItems: lineItems.current,
        orders,
        allOrders,
      });

    propsClose();
  };

  const handleClose = (event, reason) => {
    if (reason !== "backdropClick") {
      onClose();
    }
  };

  useImperativeHandle(ref, () => ({
    close() {
      onClose();
    },
  }));

  const onLineItemsSelect = (_lineItems, _orders, isSelected, _allOrders) => {
    let mergedLineItems = [...lineItems.current];
    let mergedOrders;
    if (isSelected) {
      // Merge and de-dupe line items
      let newLineItemsIndex = 0;
      _lineItems.forEach(li => {
        const isLineItemExist = lineItems.current.some(
          ({ id }) => id === li.id || (id && id === li.orderLineItem?.id),
        );
        if (!isLineItemExist) {
          newLineItemsIndex++;
          const lineItemIndex = lineItems.current.length + newLineItemsIndex;
          // Find order for line item
          const order = _orders.find(o => o.lineItems?.edges?.find(_li => _li.node?.id === li.id),
          );
          mergedLineItems.push({
            ...li,
            orderLineItemId: li.id,
            orderLineNumber: li.lineNumber,
            lineNumber: `${lineItemIndex}`,
            purchaseOrderNumber: order.purchaseOrderNumber,
            orderId: order.id,
          });
        }
      });
      mergedOrders = [...orders];
      _orders.forEach(o => {
        if (!orders.find(_o => o.id === _o.id)) {
          mergedOrders.push(o);
        }
      });
    }
    else {
      // Unselect [order] line item
      _lineItems.forEach(li => {
        let hasExistingLineItems = false;
        if (actionMode === "edit") {
          // Only allow removal of line items not originally on BR.
          const existingLineItemToRemove = existingLineItems.find(
            ex => ex.id === li.id,
          );
          hasExistingLineItems = !!existingLineItemToRemove;
        }
        if (!hasExistingLineItems) {
          // Remove order line items.
          mergedLineItems = mergedLineItems.filter(_li => _li.id !== li.id);
        }
      });
      // After all line items processed, add only the orders for those.
      mergedOrders = [];
      const tempMergedOrders = [...orders, ..._orders];
      mergedLineItems.forEach(ml => {
        const order = tempMergedOrders.find(
          tmo => tmo.lineItems?.edges?.find(li => li.node?.id === ml.id),
        );
        if (order) {
          mergedOrders.push(order);
        }
      });
    }
    lineItems.current = mergedLineItems;
    setAllOrders(_allOrders);
    setOrders(mergedOrders);

    return _lineItems;
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      fullWidth
      maxWidth="xl"
      aria-labelledby="order-list-selection"
    >
      <DialogTitle style={{ cursor: "move" }} id="order-list-selection">
        Add eligible order line items
      </DialogTitle>
      <DialogContent>
        <OrderList
          title=""
          prefsPage={preferencesKey}
          showToolbar={false}
          enableLinks={false}
          showDetailPanel={true}
          showOnlyBookable={true}
          selectMode={selectMode}
          onLineItemsSelect={onLineItemsSelect}
          selectedLineItems={lineItems.current}
          deferPrefsUpdate={true}
        />
      </DialogContent>
      <DialogActions>
        <Button
          autoFocus
          variant="outlined"
          onClick={onClose}
          disabled={loading}
          color="primary"
          data-testid="order-list-modal-close-btn"
        >
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
});
