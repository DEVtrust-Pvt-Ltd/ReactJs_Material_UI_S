import React, {
  FunctionComponent,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useApolloClient, useQuery, useReactiveVar } from "@apollo/client";
import { makeStyles } from "@material-ui/core/styles";
import Checkbox from "@material-ui/core/Checkbox";
import Skeleton from "@material-ui/lab/Skeleton";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import { DocumentPreferences } from "../company-profile/document-preferences";
import CompanyAdminPreference from "./company-admin-preference";
import CompanyPreferenceCheckbox from "./company-preference-checkbox";
import { DocumentApprovalPreferences } from "../company-profile/documents-approval-preference";

import {
  getToken,
  getUsers,
  userById,
} from "react/graphql/queries/userQueries";
import { GET_LOOKUPS } from "../graphql/queries/lookupQueries";
import { updateOrgPreferences } from "../graphql/mutations/preferencesMutations";
import { editChangeControlUsers } from "../graphql/mutations/entityRightsMutations";
import { TrackingEventsPrefillOptionsList } from "./tracking-event-prefill-list";
import { NotesPrefillOptionsList } from "./notes-prefill-list";
import { DocAutomaticCreationPreferences } from "../company-profile/edocument-automatic-creation";
import { getPreferencesByCompanyId } from "react/graphql/queries/companyQueries";

const HIDE_FOR_RELEASE_9_19 = false;

export interface ICompanyPreferencesProps {}

export const CompanyPreferences: FunctionComponent<
  ICompanyPreferencesProps
> = () => {
  const client = useApolloClient(); // For imperative calls to save prefs
  const user = useReactiveVar(userById);
  //const preferences = user?.preferences;
  const [preferences, setPreferences] = useState<any>();
  const classes = useStyles();
  const [editedPrefsState, setEditedPrefsState] = useState({} as any);
  const [saving, setSaving] = useState(false);
  const [isApi, setIsApi] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBuyer, setIsBuyer] = useState(false);
  const [isDocumentPrefChecked, setIsDocumentPrefChecked] = useState(false);
  const [isDocumentApprovalPrefChecked, setIsDocumentApprovalPrefChecked] =
    useState(false);

  const [isControlPreferenceChecked, setIsControlPreferenceChecked] =
    useState(false);
  const [controlPreferenceError, setControlPreferenceError] = useState(false);
  const [controlPreferenceUsersList, setControlPreferenceUsersList] = useState(
    []
  );

  const [isLocationPreferenceChecked, setIsLocationPreferenceChecked] =
    useState(false);
  const [locationPreferenceError, setLocationPreferenceError] = useState(false);
  const [locationPreferenceUsersList, setLocationPreferenceUsersList] =
    useState([]);

  const [isCompanyPreferenceChecked, setIsCompanyPreferenceChecked] =
    useState(false);
  const [companyPreferenceUsersList, setCompanyPreferenceUsersList] = useState(
    []
  );
  const [companyPreferenceError, setCompanyPreferenceError] = useState(false);

  const [usersCompany, setUsersCompany] = useState([]);
  const [isVendor, setIsVendor] = useState(false);
  const [token, setToken] = useState("");
  const [
    isTrackingEventPrefillPrefChecked,
    setIsTrackingEventPrefillPrefChecked,
  ] = useState(false);
  const [isNotesPrefillPrefChecked, setIsNotesPrefillPrefChecked] =
    useState(false);
  const [enableBookingRequestRejection, setEnableBookingRequestRejection] =
    useState(false);
  const [isautomaticeDocPrefChecked, setIsautomaticeDocPrefChecked] =
    useState(false);
  const [enableBookingRequestApproval, setEnableBookingRequestApproval] =
    useState(false);
  const [forceSupplierChangeControl, setForceSupplierChangeControl] =
    useState(false);
  const { data: lookupsRes, loading: isLoadingLookups } = useQuery(
    GET_LOOKUPS,
    {
      variables: { filter: "ProductIdentifier" },
    }
  );

  const getUsersCompany = async () => {
    if (!usersCompany.length) {
      const dataUser = await getUsers(client);
      const users = dataUser.data?.sort((a, b) => {
        if (a.email.startsWith("admin_")) return -1;
        if (a.email < b.email) return -1;
        if (a.email > b.email) return 1;
        return 0;
      });
      setUsersCompany(users ?? []);
    }
  };

  useEffect(() => {
    getUsersCompany();
  }, []);

  useEffect(() => {
    fetchOrgPreferences();
  }, []);

  const fetchOrgPreferences = async () => {
    const response = await getPreferencesByCompanyId(client, {
      orgId: user?.org?.id,
    });
    const companyDefaultPref = response?.companyById?.preferences;
    setPreferences(companyDefaultPref);
  };

  useEffect(() => {
    if (!preferences) return;

    const _editedPrefsState = { ...editedPrefsState };
    if (preferences?.cancelByDateShownAsNA != null) {
      _editedPrefsState.cancelByDateShownAsNA =
        preferences?.cancelByDateShownAsNA;
    }
    if (preferences?.termsAndConditions != null) {
      _editedPrefsState.termsAndConditions = preferences?.termsAndConditions;
    }
    setEditedPrefsState(_editedPrefsState);
    setIsDocumentPrefChecked(
      preferences?.bookingRequest?.RequiredDocsForBooking
    );
    setIsDocumentApprovalPrefChecked(
      preferences?.bookingRequest?.RequiredDocsApprovalForBooking
    );
    setIsTrackingEventPrefillPrefChecked(
      preferences?.shipment?.trackingEventsPreFill
    );
    setIsNotesPrefillPrefChecked(preferences?.shipment?.notesPreFill);
    setIsControlPreferenceChecked(
      preferences?.purchaseOrder?.enableChangeControl
    );
    setIsLocationPreferenceChecked(preferences?.enableLocationAutoCreate);
    setIsCompanyPreferenceChecked(preferences?.enableCompanyAutoCreate);
    setEnableBookingRequestRejection(
      preferences?.bookingRequest?.enableBookingRequestRejection
    );
    setEnableBookingRequestApproval(
      preferences?.bookingRequest?.enableBookingRequestApproval
    );
    setForceSupplierChangeControl(
      preferences?.purchaseOrder?.forceSupplierChangeControl
    );

    if (
      //preferences?.enableISF ||  // enabled after MP-1449 will complete AC- 6.b.2
      preferences?.enableCBP7501 ||
      preferences?.enableAutomaticPackingListCreation ||
      preferences?.enableAutomaticShipmentCommercialInvoice ||
      preferences?.enableReconciledCommercialInvoice
    ) {
      setIsautomaticeDocPrefChecked(true);
    } else {
      setIsautomaticeDocPrefChecked(false);
    }
  }, [preferences]);

  useEffect(() => {
    if (user) {
      setIsBuyer(user?.org?.roles?.some((role) => role.value === "Buyer"));
    }
    if (!preferences) return;

    setIsApi(user?.preferences?.permissions?.includes("api"));
    setIsAdmin(user?.preferences?.permissions?.includes("admin"));
    setIsVendor(user?.preferences?.permissions?.includes("vendor"));
  }, [user, preferences]);

  const saveUsersToEditedPrefs = (users = []) => {
    setEditedPrefsState((prevState) => ({
      ...prevState,
      locationAutoCreateContactList: users.map(({ id }) => id),
    }));
  };

  useEffect(() => {
    saveUsersToEditedPrefs(locationPreferenceUsersList);
  }, [locationPreferenceUsersList]);

  const updateCompanyAutoCreate = (users = []) => {
    setEditedPrefsState((prevState) => ({
      ...prevState,
      companyAutoCreateContactList: users?.map(({ id }) => id),
    }));
  };

  useEffect(() => {
    updateCompanyAutoCreate(companyPreferenceUsersList);
  }, [companyPreferenceUsersList]);

  const getControlPreferenceEnabledUsers = (users) => {
    const enabledUsers = users?.filter(
      ({ entityRights }) => entityRights?.isAllowedToAcceptChangeRequest
    );
    setControlPreferenceUsersList(enabledUsers);
  };

  useEffect(() => {
    getControlPreferenceEnabledUsers(usersCompany);
  }, [usersCompany]);

  const assignIdsToUserEntity = (ids = []) => {
    if (!ids) return [];
    return ids.map((id) => usersCompany.find((el) => el.id === id) ?? {});
  };

  useEffect(() => {
    if (!preferences) return;

    const {
      locationAutoCreateContactList = [],
      companyAutoCreateContactList = [],
    } = preferences;
    setLocationPreferenceUsersList(
      assignIdsToUserEntity(locationAutoCreateContactList)
    );
    setCompanyPreferenceUsersList(
      assignIdsToUserEntity(companyAutoCreateContactList)
    );
  }, [usersCompany, preferences]);

  const handleControlPreferenceChange = (checked) => {
    setIsControlPreferenceChecked(checked);
    setForceSupplierChangeControl(checked);
    setEditedPrefsState((prevPrefs) => ({
      ...prevPrefs,
      purchaseOrder: {
        ...prevPrefs.purchaseOrder,
        enableChangeControl: checked,
        // also toggles forceSupplierChangeControl when enabled/disabled
        forceSupplierChangeControl: checked
      },
    }));
  };
  const handleDocumentPrefChange = (event, checked) => {
    setIsDocumentPrefChecked(checked);
    setEditedPrefsState((prevPrefs) => ({
      ...prevPrefs,
      bookingRequest: {
        ...(prevPrefs.bookingRequest ?? {}),
        RequiredDocsForBooking: checked,
      },
    }));
  };
  const handleTrackingEventPrefillListPrefChange = (event, checked) => {
    setIsTrackingEventPrefillPrefChecked(checked);
    setEditedPrefsState((prevPrefs) => ({
      ...prevPrefs,
      shipment: {
        ...(prevPrefs.shipment ?? {}),
        trackingEventsPreFill: checked,
      },
    }));
  };
  const handleNotesPrefillListPrefChange = (event, checked) => {
    setIsNotesPrefillPrefChecked(checked);
    setEditedPrefsState((prevPrefs) => ({
      ...prevPrefs,
      shipment: {
        ...(prevPrefs.shipment ?? {}),
        notesPreFill: checked,
      },
    }));
  };
  const handleDocumentApprovalPrefChange = (event, checked) => {
    setIsDocumentApprovalPrefChecked(checked);
    setEditedPrefsState((prevPrefs) => ({
      ...prevPrefs,
      bookingRequest: {
        ...(prevPrefs.bookingRequest ?? {}),
        RequiredDocsApprovalForBooking: checked,
        RequiredDocsApprovalForBookingNotification: checked,
      },
    }));
  };

  const handleControlPreferenceUsersListChange = (list) => {
    setControlPreferenceUsersList(list);
    setControlPreferenceError(false);
  };

  const handleLocationPreferenceChange = (checked) => {
    setIsLocationPreferenceChecked(checked);
    setEditedPrefsState((prevPrefs) => ({
      ...prevPrefs,
      enableLocationAutoCreate: checked,
    }));
  };

  const handleLocationPreferenceUsersListChange = (list) => {
    setLocationPreferenceUsersList(list);
    setLocationPreferenceError(false);
  };

  const handleCompanyPreferenceChange = (checked) => {
    setIsCompanyPreferenceChecked(checked);
    setEditedPrefsState((prevPrefs) => ({
      ...prevPrefs,
      enableCompanyAutoCreate: checked,
    }));
  };

  const handleDocAutomaticCreationPrefChange = (event, checked) => {
    setIsautomaticeDocPrefChecked(checked);
  };

  const handleCompanyPreferenceUsersListChange = (list) => {
    setCompanyPreferenceUsersList(list);
    setCompanyPreferenceError(false);
  };

  const onEnableBookingRequestRejectionChange = useCallback((newValue) => {
    setEnableBookingRequestRejection(newValue);
    setEditedPrefsState((prevPrefs) => ({
      ...prevPrefs,
      bookingRequest: {
        ...(prevPrefs.bookingRequest ?? {}),
        enableBookingRequestRejection: newValue,
      },
    }));
  }, []);

  const handleEnableBookingRequestApprovalChange = useCallback((checked) => {
    setEnableBookingRequestApproval(checked);
    setEditedPrefsState((prevPrefs) => ({
      ...prevPrefs,
      bookingRequest: {
        ...(prevPrefs.bookingRequest ?? {}),
        enableBookingRequestApproval: checked,
      },
    }));
  }, []);

  const handleEnableForceSupplierChangeControl = useCallback((checked) => {
    setForceSupplierChangeControl(checked);
    setEditedPrefsState((prevPrefs) => ({
      ...prevPrefs,
      purchaseOrder: {
        ...(prevPrefs.purchaseOrder ?? {}),
        forceSupplierChangeControl: checked,
      },
    }));
  }, []);

  function storeCheckboxPrefs(event, field) {
    const isChecked = event.target.checked;
    const _editedPrefsState = { ...editedPrefsState };
    _editedPrefsState[field] = isChecked;
    setEditedPrefsState(_editedPrefsState);
  }

  function storeTextPrefs(event, field) {
    const value = event.target.value;
    const _editedPrefsState = { ...editedPrefsState };
    _editedPrefsState[field] = value;
    setEditedPrefsState(_editedPrefsState);
  }

  const savePrefs = useCallback(async () => {
    if (isControlPreferenceChecked) {
      if (!controlPreferenceUsersList.length) {
        setControlPreferenceError(true);
        return;
      }
    }

    if (isLocationPreferenceChecked) {
      if (!locationPreferenceUsersList.length) {
        setLocationPreferenceError(true);
        return;
      }
    }

    if (isCompanyPreferenceChecked) {
      if (!companyPreferenceUsersList.length) {
        setCompanyPreferenceError(true);
        return;
      }
    }

    setSaving(true);

    const editChangeControlMutationInput = usersCompany.map(
      ({ id: userId, email, org, entityRights }) => {
        const isSelected = controlPreferenceUsersList.some(
          ({ id }) => id === userId
        );
        return {
          email,
          orgId: org.id,
          isHiddenFromOtherOrgs: entityRights?.isHiddenFromOtherOrgs ?? false,
          isAllowedToAcceptOrders:
            entityRights?.isAllowedToAcceptOrders ?? false,
          isAllowedToAcceptChangeRequest: isSelected,
        };
      }
    );
    await editChangeControlUsers({
      client,
      variables: { input: editChangeControlMutationInput },
    });

    const _editedPrefsState = {};
    Object.keys(editedPrefsState).forEach((key) => {
      if (editedPrefsState[key] != null) {
        _editedPrefsState[key] = editedPrefsState[key];
      }
    });

    let updateAutomaticeDocpref = {};
    if (!isautomaticeDocPrefChecked) {
      updateAutomaticeDocpref = {
        enableISF: false,
        enableCBP7501: false,
        enableAutomaticPackingListCreation: false,
        enableAutomaticShipmentCommercialInvoice: false,
        enableReconciledCommercialInvoice: false,
      };
    }
    await updateOrgPreferences({
      client,
      mergeObj: { ..._editedPrefsState, ...updateAutomaticeDocpref },
    });
    fetchOrgPreferences();
    setSaving(false);
  }, [
    isControlPreferenceChecked,
    controlPreferenceUsersList,
    isCompanyPreferenceChecked,
    usersCompany,
    editedPrefsState,
    isautomaticeDocPrefChecked,
  ]);

  const getUserToken = async () => {
    const { data } = await getToken(client, { type: "API" });
    setToken(data?.generateToken?.token);
  };

  if (isLoadingLookups) {
    return (
      <div className={classes.container}>
        <Skeleton animation="wave" className={classes.skeleton} />
        <Skeleton animation="wave" className={classes.skeleton} />
        <Skeleton animation="wave" className={classes.skeleton} />
      </div>
    );
  }

  return (
    <div className={classes.container}>
      <div className={classes.fieldContainer}>
        <Typography className={classes.descriptionHeader} color="primary">
          Default Purchase Order Terms And Conditions
        </Typography>
        <div className={classes.textInput}>
          <TextField
            value={editedPrefsState.termsAndConditions}
            variant="standard"
            multiline
            fullWidth
            maxRows={10}
            onChange={(event) => storeTextPrefs(event, "termsAndConditions")}
          />
        </div>
      </div>
      <div className={classes.row}>
        <Checkbox
          checked={editedPrefsState.cancelByDateShownAsNA === true}
          onChange={(event) =>
            storeCheckboxPrefs(event, "cancelByDateShownAsNA")
          }
        />
        <div>
          <Typography className={classes.descriptionHeader} color="primary">
            Cancel by Date
          </Typography>
          <Typography className={classes.description} color="primary">
            Display Cancel by Date as N/A if null
          </Typography>
        </div>
      </div>
      {isVendor && (
        <div className={classes.fieldContainer}>
          <Typography className={classes.descriptionHeader} color="primary">
            Secret
          </Typography>
          <div className={classes.textInput}>
            <TextField
              variant="standard"
              fullWidth
              onChange={(event) => storeTextPrefs(event, "secret")}
            />
          </div>
        </div>
      )}

      {isAdmin && (
        <>
          <CompanyAdminPreference
            id="enable-change-control-users"
            users={usersCompany}
            title="Enable Change Control"
            description="Require approvals to change on a PO"
            subtitle="Default Change Control Agents"
            error={controlPreferenceError}
            errorMessage="At least 1 user must be selected"
            isChecked={isControlPreferenceChecked}
            onValueChange={handleControlPreferenceChange}
            list={controlPreferenceUsersList}
            onListChange={handleControlPreferenceUsersListChange}
          />
          {isBuyer && isControlPreferenceChecked && (
            <CompanyPreferenceCheckbox
              title="Required Change Control for All Suppliers"
              description="Force all suppliers to use change control"
              label="force-supplier-change-control"
              value={forceSupplierChangeControl}
              onChange={handleEnableForceSupplierChangeControl}
            />
          )}
          <CompanyAdminPreference
            id="auto-create-location-users"
            users={usersCompany}
            title="Add new locations automatically"
            description="Automatically add unknown locations on a PO"
            subtitle="Exception report recipients"
            error={locationPreferenceError}
            errorMessage="At least 1 user must be selected"
            isChecked={isLocationPreferenceChecked}
            onValueChange={handleLocationPreferenceChange}
            list={locationPreferenceUsersList}
            onListChange={handleLocationPreferenceUsersListChange}
          />
          <CompanyAdminPreference
            id="auto-create-company-users"
            users={usersCompany}
            title="Add new companies automatically"
            description="Automatically add unknown companies on a PO"
            subtitle="New Company Admin Users"
            error={companyPreferenceError}
            errorMessage="At least 1 user must be selected"
            isChecked={isCompanyPreferenceChecked}
            onValueChange={handleCompanyPreferenceChange}
            list={companyPreferenceUsersList}
            onListChange={handleCompanyPreferenceUsersListChange}
          />
          <div className={classes.autoLocationRow}>
            <div className={classes.row}>
              <Checkbox
                checked={isTrackingEventPrefillPrefChecked}
                onChange={handleTrackingEventPrefillListPrefChange}
              />
              <div>
                <Typography
                  className={classes.descriptionHeader}
                  color="primary"
                >
                  Tracking Events Prefill List
                </Typography>
                <Typography className={classes.description} color="primary">
                  Display prefill event list when editing tracking event body
                  field
                </Typography>
              </div>
              {isTrackingEventPrefillPrefChecked && (
                <TrackingEventsPrefillOptionsList />
              )}
            </div>
          </div>

          <div className={classes.autoLocationRow}>
            <div className={classes.row}>
              <Checkbox
                checked={isNotesPrefillPrefChecked}
                onChange={handleNotesPrefillListPrefChange}
              />
              <div>
                <Typography
                  className={classes.descriptionHeader}
                  color="primary"
                >
                  Notes Prefill List
                </Typography>
                <Typography className={classes.description} color="primary">
                  Display prefill event list when editing tracking event body
                  field
                </Typography>
              </div>
              {isNotesPrefillPrefChecked && <NotesPrefillOptionsList />}
            </div>
          </div>

          <div className={classes.autoLocationRow}>
            <div className={classes.row}>
              <Checkbox
                checked={isDocumentPrefChecked}
                onChange={handleDocumentPrefChange}
              />
              <div>
                <Typography
                  className={classes.descriptionHeader}
                  color="primary"
                >
                  Require documents for Booking Requests
                </Typography>
                <Typography className={classes.description} color="primary">
                  Booking Requests blocked without selected documents
                </Typography>
              </div>
              {isDocumentPrefChecked && <DocumentPreferences />}
            </div>
          </div>

          {!HIDE_FOR_RELEASE_9_19 && (
            <div className={classes.autoLocationRow}>
              <div className={classes.row}>
                <Checkbox
                  checked={isDocumentApprovalPrefChecked}
                  onChange={handleDocumentApprovalPrefChange}
                />
                <div>
                  <Typography
                    className={classes.descriptionHeader}
                    color="primary"
                  >
                    Require document approval
                  </Typography>
                  <Typography className={classes.description} color="primary">
                    Documents must be approved before booking
                  </Typography>
                </div>
                {isDocumentApprovalPrefChecked && (
                  <DocumentApprovalPreferences />
                )}
              </div>
            </div>
          )}

          <CompanyPreferenceCheckbox
            title="Enable Business Rules support"
            description="Allows a Freight Forwarder to reject and resubmit Booking Requests"
            label="enable-business-rules-support"
            value={enableBookingRequestRejection}
            onChange={onEnableBookingRequestRejectionChange}
          />

          <CompanyPreferenceCheckbox
            title="Booking Request Approval Required"
            description="Requires Importer to approve or decline each Booking Request"
            label="booking-request-approval-required"
            value={enableBookingRequestApproval}
            onChange={handleEnableBookingRequestApprovalChange}
          />

          <div className={classes.autoLocationRow}>
            <div className={classes.row}>
              <Checkbox
                checked={isautomaticeDocPrefChecked}
                onChange={handleDocAutomaticCreationPrefChange}
              />
              <div>
                <Typography
                  className={classes.descriptionHeader}
                  color="primary"
                >
                  Enable Automatic eDoc Creation
                </Typography>
                <Typography className={classes.description} color="primary">
                  eDocs will be automatically created and visible in documents
                  lists
                </Typography>
              </div>
              {isautomaticeDocPrefChecked && (
                <DocAutomaticCreationPreferences />
              )}
            </div>
          </div>
        </>
      )}

      <Button
        className={classes.button}
        variant="contained"
        color="secondary"
        onClick={savePrefs}
        disabled={saving}
      >
        Save
      </Button>

      {isApi && (
        <div className={classes.rowToken}>
          <div>
            <Button
              variant="contained"
              color="primary"
              onClick={getUserToken}
              disabled={saving}
            >
              Get token
            </Button>
          </div>
          <Typography className={classes.token} color="primary">
            {token}
          </Typography>
        </div>
      )}
    </div>
  );
};

const useStyles = makeStyles({
  container: {
    marginBottom: "5rem",
  },
  row: {
    width: "100%",
    display: "flex",
    marginBottom: "2rem",
  },
  fieldContainer: {
    padding: "1.5rem",
    marginBottom: "2rem",
  },
  descriptionHeader: {
    fontSize: "2rem",
  },
  description: {},
  textInput: {
    maxWidth: "50rem",
  },
  token: {
    wordWrap: "break-word",
    width: "80%",
    padding: "1.5rem",
  },
  rowToken: {
    display: "flex",
    margin: "1.5rem",
    marginBottom: "2rem",
  },
  button: {
    marginLeft: "1.5rem",
  },
  skeleton: {
    flex: 1,
    height: "3rem",
  },
  autoLocationRow: {
    display: "flex",
    flexWrap: "wrap",
    marginTop: "1rem",
    marginBottom: "1rem",
  },
  autoLocationSelectWrapper: {},
  autoLocationSelect: {
    whiteSpace: "pre-wrap",
  },
});
