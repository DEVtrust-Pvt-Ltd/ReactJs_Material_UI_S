import React, { FunctionComponent, useCallback } from "react";

import { makeStyles } from "@material-ui/core/styles";
import Checkbox from "@material-ui/core/Checkbox";
import Typography from "@material-ui/core/Typography";

import CompanyUserChip from "./company-user-chip";
import CompanyUsersAutocomplete from "./company-users-autocomplete";

export interface ICompanyAdminPreference {
  id: string;
  title: string;
  description: string;
  subtitle: string;
  isChecked: boolean;
  onValueChange: Function;
  list: any[];
  onListChange: Function;
  error: boolean;
  errorMessage: string;
  users: any[];
}

const CompanyAdminPreference: FunctionComponent<ICompanyAdminPreference> = ({
  id,
  title,
  description,
  subtitle,
  isChecked = false,
  onValueChange,
  list = [],
  onListChange,
  error = false,
  errorMessage,
  users = [],
}) => {
  const classes = useStyles();

  const handleValueChange = useCallback(
    (event, checked) => {
      onValueChange(checked);
    },
    [onValueChange],
  );

  const handleListAddChange = useCallback(user => {
    if (!user) return;

    const newList = [...list, user];
    onListChange(newList);
  }, [onListChange, list]);

  const handleListRemoveChange = useCallback(user => {
    const newList = [...list].filter(({ id: userId }) => userId !== user.id);
    onListChange(newList);
  }, [onListChange, list]);

  return (
    <div className={classes.container}>
      <div className={classes.row}>
        <Checkbox checked={isChecked} onChange={handleValueChange} />
        <div>
          <Typography className={classes.title} color="primary">
            {title}
          </Typography>
          <Typography color="primary">{description}</Typography>
        </div>
      </div>

      {isChecked && (
        <div className={classes.content}>
          <div>
            <Typography color="primary">{subtitle}</Typography>
          </div>
          <div>
            <CompanyUsersAutocomplete
              id={id}
              options={users}
              selectedOptions={list}
              onChange={handleListAddChange}
            />
            {Boolean(list.length) && (
              <div>
                {list.map((el) => (
                  <CompanyUserChip
                    key={`${subtitle}-${el.id}`}
                    user={el}
                    onDelete={() => handleListRemoveChange(el)}
                  />
                ))}
              </div>
            )}
          </div>
          {error && (
            <div>
              <Typography className={classes.error} color="primary">
                {errorMessage}
              </Typography>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanyAdminPreference;

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
  content: {
    width: "100%",
    maxWidth: "50rem",
    marginLeft: "1.5rem",
    marginTop: "1rem",
  },
  title: {
    fontSize: "2rem",
  },
  error: {
    marginTop: "1rem",
    color: "red",
  },
});
