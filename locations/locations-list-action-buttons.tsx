import * as React from "react";
import { FunctionComponent, useState, useRef, useEffect } from "react";
import { useApolloClient } from "@apollo/client";
import { Color } from "@material-ui/lab/Alert";
import Tooltip from "@material-ui/core/Tooltip";
import Zoom from "@material-ui/core/Zoom";
import IconButton from "@material-ui/core/IconButton";
import AddCircleOutline from "@material-ui/icons/AddCircleOutline";
import { createStyles, makeStyles } from "@material-ui/core/styles";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Select from "@material-ui/core/Select";
import InputLabel from "@material-ui/core/InputLabel";
import { LocationAddDialog } from "./location-add-dialog";
import { MercadoAlert } from "react/common/components/mercadoAlert";
import { saveDefaultLocation } from "../graphql/mutations/locationMutations";

export interface ILocationListActionButtonsProps {
  locations: any;
  onRefetch: Function;
}

export const LocationListActionButtons: FunctionComponent<ILocationListActionButtonsProps> = (
  props: ILocationListActionButtonsProps,
) => {
  const {
    locations,
    onRefetch,
  } = props;

  const classes = useStyles();
  const client = useApolloClient();
  const [defaultLocation, setDefaultLocation] = useState("");
  const [severity, setSeverity] = useState("success");
  const [errorMsg, setMsg] = useState("");
  const alertRef = useRef(null);
  const dialogRef = useRef(null);

  function locationTypeMap(list) {
    return list.map(item => (
      <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
    ));
  }

  useEffect(() => {
    locations.forEach(l => {
      if (l.isDefault === true) {
        setDefaultLocation(l.id);
      }
    });
  }, [locations]);

  async function handleChange(event) {
    const locationId = event.target.value;
    const { errors } = await saveDefaultLocation({
      client,
      variables: { locationId },
    });
    if (errors) {
      setMsg("Unable to save default location");  // ToDo: translate
      setSeverity("error");
      alertRef.current.open();
    }
    else {
      setDefaultLocation(event.target.value);
      setMsg("Default Location saved");
      setSeverity("success");
      onRefetch();
      alertRef.current.open();
    }
  }

  const handleClickOpen = () => {
    dialogRef.current.open();
  };

  return (
    <div className={classes.container}>
      <Tooltip title="Default Location" TransitionComponent={Zoom} arrow={true}>
        <FormControl className={classes.formControl}>
          <InputLabel id="default-location">Default Location</InputLabel>
          <Select
            labelId="default-location-label"
            id="default-location-select"
            value={defaultLocation}
            onChange={handleChange}
            defaultValue={defaultLocation}
          >
            {locationTypeMap(locations)}
          </Select>
        </FormControl>
      </Tooltip>

      <Tooltip title="Add Location" TransitionComponent={Zoom} arrow={true}>
        <IconButton
          aria-label="Add Location"
          onClick={handleClickOpen}
          color="primary"
          className={classes.buttonSpacing}
        >
          <AddCircleOutline className={classes.iconSize} />
        </IconButton>
      </Tooltip>

      <LocationAddDialog
        title="Add Location"
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

const useStyles = makeStyles(theme => createStyles({
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
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
}));
