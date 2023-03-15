import React from "react";

import { createStyles, makeStyles } from "@material-ui/core/styles";
import CancelIcon from "@material-ui/icons/Cancel";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";

interface ICompanyUserChipProps {
  user: any;
  onDelete: () => void;
}

const CompanyUserChip = ({ user = {}, onDelete = () => { } }: ICompanyUserChipProps) => {
  const classes = useStyles();

  return (
    <>
      {user.id && (
        <div className={classes.chipBoxWrapper}>
          <Typography className={classes.chipBox}>{user.email}</Typography>
          <IconButton
            aria-label="Cancel"
            className={classes.cancelButton}
            data-testid="containerCancelButton"
            data-userid={user.id}
            onClick={onDelete}
          >
            <CancelIcon className={classes.iconSize} />
          </IconButton>
        </div>
      )}
    </>
  );
};

const useStyles = makeStyles(() => createStyles({
  chipBoxWrapper: {
    padding: "0 0 0 0.5rem",
    margin: "0.7rem 0",
    // From material-ui
    border: "1px solid rgba(0, 0, 0, 0.23)",
    backgroundColor: "transparent",
    borderRadius: "16px",
    display: "flex",
    justifyContent: "space-between",
  },
  chipBox: {
    paddingTop: "6px",
  },
  cancelButton: {
    padding: "6px",
  },
  iconSize: {
    fontSize: "2rem",
  },
}));

export default CompanyUserChip;
