import React, { useMemo, useState } from "react";

import Autocomplete from "@material-ui/lab/Autocomplete/Autocomplete";
import TextField from "@material-ui/core/TextField";

interface ICompanyUsersAutocompleteProps {
  id: string;
  options: any[];
  selectedOptions: any[];
  // eslint-disable-next-line no-unused-vars
  onChange: (option: any) => void;
}

const CompanyUsersAutocomplete = ({
  id = "",
  options = [],
  selectedOptions = [],
  onChange = () => { },
}: ICompanyUsersAutocompleteProps) => {
  const [inputText, setInputText] = useState("");

  const availableOptions = useMemo(
    () => options.filter(el1 => !selectedOptions.some(el2 => el1.id === el2.id)),
    [options, selectedOptions],
  );

  const handleInputTextChange = (event, newInputText, reason) => {
    if (reason === "reset") {
      setInputText("");
      return;
    }

    setInputText(newInputText);
  };

  const optionLabelCb = ({ email }) => email;

  const handleOptionSelect = (event, value) => {
    onChange(value);
  };

  return (
    <Autocomplete
      getOptionLabel={optionLabelCb}
      options={availableOptions}
      id={id}
      clearOnEscape
      clearOnBlur
      onChange={handleOptionSelect}
      inputValue={inputText}
      onInputChange={handleInputTextChange}
      renderInput={params => (
        <TextField {...params} label="" variant="standard" />
      )}
    />
  );
};

export default CompanyUsersAutocomplete;
