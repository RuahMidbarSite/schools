import React, { useState, ChangeEvent, FormEvent, useContext, useMemo, useEffect } from 'react';
import { deleteNamesFromCollection, insertNamesIntoCollection } from '@/db/generalrequests';
import { CustomContext } from '@/app/settingsPage/context';
import { updateStorage } from '../SettingsPage/Storage/Storage/SettingsDataStorage';
import { listSubheaderClasses } from '@mui/material';
import { MdAdminPanelSettings } from 'react-icons/md';
import { EducationStage } from '@prisma/client';
import { MapFromTableToField } from '@/offlineStorage/storage';
import CreatableSelect from 'react-select/creatable';
import { Button } from 'react-bootstrap';


interface AddNamesFormProps {
  collectionName: string;
  idFieldName: string;
  nameFieldName: string;
  placeHolder: string;
  onClose: () => void;
}

interface OptionType {
  value: string;
  label: string;
}

const AddNamesForm: React.FC<AddNamesFormProps> = ({ collectionName, idFieldName, nameFieldName, onClose, placeHolder }) => {
  const [selectedOptions, setSelectedOptions] = useState<OptionType[]>([]);
  const [options, setOptions] = useState<OptionType[]>([]);
  const [data, setData] = useState([])

  const {
    Roles, Years, ProductTypes, Types, Stages, Religion, Areas, Cities, Orders, SchoolStatuses,
    ProgramStatuses,
    ContactsStatuses,
    GuidesStatuses,
    setRoles, setYears, setProductTypes, setTypes, setStages, setReligion, setAreas, setCities, setOrders,
    setSchoolStatuses,
    setProgramStatuses,
    setContactsStatuses,
    setGuidesStatuses,
  } = useContext(CustomContext);

  const mapping = useMemo(() => {
    const map = new Map();
    map.set('Role', { data: Roles, setter: setRoles });
    map.set('Years', { data: Years, setter: setYears });
    map.set('ProductTypes', { data: ProductTypes, setter: setProductTypes });
    map.set('SchoolTypes', { data: Types, setter: setTypes });
    map.set('EducationStage', { data: Stages, setter: setStages });
    map.set('ReligionSector', { data: Religion, setter: setReligion });
    map.set('Areas', { data: Areas, setter: setAreas });
    map.set('Cities', { data: Cities, setter: setCities });
    map.set('Orders', { data: Orders, setter: setOrders });
    map.set('StatusSchools', { data: SchoolStatuses, setter: setSchoolStatuses })
    map.set('StatusContacts', { data: ContactsStatuses, setter: setContactsStatuses })
    map.set('StatusPrograms', { data: ProgramStatuses, setter: setProgramStatuses })
    map.set('StatusGuides', { data: GuidesStatuses, setter: setGuidesStatuses })
    return map;
  }, [Roles, setRoles, Years, setYears, ProductTypes, setProductTypes, Types, setTypes, Stages, setStages, Religion, setReligion, Areas, setAreas, Cities, setCities, Orders, setOrders, SchoolStatuses, setSchoolStatuses, ContactsStatuses, setContactsStatuses, ProgramStatuses, setProgramStatuses, GuidesStatuses, setGuidesStatuses]);

  useEffect(() => {
    const collectionData = mapping.get(collectionName);
    if (collectionData && collectionData.data && collectionData.data.length > 0) {
      const formattedOptions = collectionData.data.map((item: any) => ({
        value: item[idFieldName],
        label: item[nameFieldName],
      }));
      setData(collectionData.data);
      setOptions(formattedOptions);
      setSelectedOptions(formattedOptions);
    }
  }, [collectionName, idFieldName, nameFieldName, mapping]);


  const handleChange = (selected: OptionType[] | null) => {
    setSelectedOptions(selected || []);
  };


  const handleUpdateCollection = async () => {
    onClose();
    try {
      console.log(options);
      const existingNames = new Set(options.map(opt => opt.label));
      const selectedNames = new Set(selectedOptions.map(opt => opt.label));

      const namesToAdd = [...selectedNames].filter(name => !existingNames.has(name));
      const namesToRemove = [...existingNames].filter(name => !selectedNames.has(name));

      let insertedData = [];
      let updatedData = []
      // Insert new names
      if (namesToAdd.length > 0) {
        insertedData = await insertNamesIntoCollection(
          collectionName,
          idFieldName,
          nameFieldName,
          namesToAdd
        );
      }
      // this returns the updated data
      if (namesToRemove.length > 0) {
        updatedData = await deleteNamesFromCollection(
          collectionName,
          nameFieldName,
          insertedData.length > 0 ? [...insertedData.map((val)=>val[nameFieldName]),...Array.from(existingNames)]:Array.from(existingNames),
          namesToRemove,
          idFieldName
        );
      }

      const fieldName = MapFromTableToField.get(collectionName);

      let updatedList = namesToRemove.length > 0 ? updatedData : [...insertedData, ...data]
      updatedList = updatedList.sort((a, b) => a[nameFieldName].localeCompare(b[nameFieldName], 'he'));

      updateStorage({ [fieldName]: updatedList });

      setData(updatedList);

      // Use the mapped setter function to update the context
      const collectionData = mapping.get(collectionName);
      if (collectionData) {
        collectionData.setter(updatedList);
      }


    } catch (error) {
      console.error('Error updating names:', error);
    }
  };


  return (
    <div className="select-button-container">
      <CreatableSelect
        isMulti
        value={selectedOptions}
        onChange={handleChange}
        options={options}
        isClearable={false}
        placeholder={placeHolder}
        closeMenuOnSelect={false}
        formatCreateLabel={(inputValue) => `Add "${inputValue}"`} // Customize how the new option is displayed
      />
      <br></br>
      <Button
        onClick={handleUpdateCollection}
        className="submit-button"
      >
        עדכן טבלה
      </Button>
    </div>
  );
};

export default AddNamesForm;
