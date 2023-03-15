import { cloneDeep } from "lodash";
import { locationFieldsMap } from "./locations-data-fields-map";
import { getSixDigitRandom, sortByKey } from "../common/utils";

export function processLocationConfiguration(lookup, countryId) {
  const _locationFieldsMap = cloneDeep(locationFieldsMap);
  Object.keys(lookup).forEach(key => {
    const orderField = _locationFieldsMap.find(ofield => ofield.editField === key);
    if (orderField) {
      if (lookup[key]?.options) {
        if (orderField.editField === "states") {
          const result = lookup[key]?.options?.filter(
            item => item.parentId === countryId,
          ) ?? [];
          orderField.options = [...result];
          orderField.options.sort((a, b) => sortByKey(a, b, "value"));
        }
        else {
          const result = lookup[key]?.options ?? [];
          orderField.options = [...result];
          orderField.options.sort((a, b) => sortByKey(a, b, "value"));
        }
      }
    }
  });
  return _locationFieldsMap;
}

export function processStateConfiguration(states, parentId) {
  let result = [];
  if (states) {
    result = states.filter(
      item => item.parentId === parentId,
    );
    result = [...result];
    result.sort((a, b) => sortByKey(a, b, "value"));
  }
  return result;
}

export const autoGenerateLocationIdentifier = (company = {} as any) => {
  const { id: companyOid } = company;
  const randomStr = getSixDigitRandom();
  const locationIdentifier = `LI${companyOid}${randomStr}`;
  return locationIdentifier;
};
