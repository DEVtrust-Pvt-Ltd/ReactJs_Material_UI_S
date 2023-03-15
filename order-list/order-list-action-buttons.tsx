import * as React from "react";
import { FunctionComponent, useCallback } from "react";
import Tooltip from "@material-ui/core/Tooltip";
import Zoom from "@material-ui/core/Zoom";
import IconButton from "@material-ui/core/IconButton";
import CloudUpload from "@material-ui/icons/CloudUpload";
import AddCircleOutline from "@material-ui/icons/AddCircleOutline";
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import { gql, useReactiveVar } from "@apollo/client";
import { DownloadButton } from "../download-button/download-button";
import { userById } from "../graphql/queries/userQueries";

const GET_ORDERS_CSV = gql`
  {
    ordersToCSV {
      link
    }
  }
`;

export interface OrderListActionButtonsProps {
  navigate: any;
}

export const OrderListActionButtons: FunctionComponent<
  OrderListActionButtonsProps
> = ({ navigate }) => {
  const classes = useStyles();
  const user = useReactiveVar(userById);

  const onCreateButtonClick = useCallback(
    (event) => {
      event.preventDefault();
      navigate("/create-order");
    },
    [navigate]
  );
  const hasUserBuyerRole = React.useMemo(
    () => user?.org?.roles?.some(({ value }) => value === "Buyer"),
    [user]
  );

  return (
    <div className={classes.container}>
      <DownloadButton
        query={GET_ORDERS_CSV}
        tooltip="Download Orders CSV"
        color="primary"
        dataKey="ordersToCSV"
        snackbarStyle={bareStyles.downloadButtonSnackbar}
        iconButtonClass={classes.buttonSpacing}
        dataTestId="downloadOrdersCsvButton"
      />

      {hasUserBuyerRole && (
        <Tooltip title="Create P.O." TransitionComponent={Zoom} arrow={true}>
          <IconButton
            aria-label="Create P.O."
            // href="/create-order"
            onClick={onCreateButtonClick}
            color="primary"
            data-testid="createPOButton"
            className={classes.buttonSpacing}
          >
            <AddCircleOutline className={classes.iconSize} />
          </IconButton>
        </Tooltip>
      )}
    </div>
  );
};

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    container: {
      display: "flex",
      justifyContent: "flex-end",
      padding: "0 0 2rem 0",
    },
    buttonSpacing: {
      margin: "0 1rem 0 1rem",
    },
    iconSize: {
      fontSize: "3.5rem",
    },
  })
);

const bareStyles = {
  downloadButtonSnackbar: {
    marginTop: "115px",
  },
};
