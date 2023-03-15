import React, { FunctionComponent, useCallback } from "react";

import { makeStyles } from "@material-ui/core/styles";
import Checkbox from "@material-ui/core/Checkbox";
import Typography from "@material-ui/core/Typography";

export interface ICompanyPreferenceCheckbox {
  title: string;
  description: string;
  value: boolean;
  onChange: Function;
  label: string;
}

const CompanyPreferenceCheckbox: FunctionComponent<
  ICompanyPreferenceCheckbox
> = ({ title, description, value, onChange, label }) => {
  const classes = useStyles();

  const handleChangeValue = useCallback(
    (_event, checked) => {
      onChange(checked);
    },
    [onChange],
  );

  return (
    <div data-aria-label={label} className={classes.container}>
      <div className={classes.row}>
        <Checkbox checked={value} onChange={handleChangeValue} />

        <div>
          <Typography className={classes.title} color="primary">
            {title}
          </Typography>
          <Typography color="primary">{description}</Typography>
        </div>
      </div>
    </div>
  );
};

export default CompanyPreferenceCheckbox;

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexWrap: "wrap",
    marginBottom: "2rem",
  },
  row: {
    display: "flex",
    width: "100%",
  },
  title: {
    fontSize: "2rem",
  },
});
