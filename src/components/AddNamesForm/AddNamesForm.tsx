"use client"
import React, { useState, useContext, useMemo, useEffect } from 'react';
import { deleteNamesFromCollection, insertNamesIntoCollection } from '@/db/generalrequests';
import { CustomContext } from '@/app/settingsPage/context';
import { updateStorage } from '../SettingsPage/Storage/Storage/SettingsDataStorage';
import { MapFromTableToField } from '@/offlineStorage/storage';
import CreatableSelect from 'react-select/creatable';
import { Button } from 'react-bootstrap';

interface AddNamesFormProps {
  collectionName: string;
  idFieldName: string;
  nameFieldName: string;
  placeHolder: string;
  onClose: () => void;
  additionalFields?: Record<string, any>; // ← תמיכה בשדות נוספים למניעת חסימות אינדקסים
}

interface OptionType {
  value: string;
  label: string;
}

const AddNamesForm: React.FC<AddNamesFormProps> = ({ 
  collectionName, idFieldName, nameFieldName, onClose, placeHolder, additionalFields 
}) => {
  const [selectedOptions, setSelectedOptions] = useState<OptionType[]>([]);
  const [options, setOptions] = useState<OptionType[]>([]);
  const [data, setData] = useState<any[]>([])

  const {
    Roles, Years, ProductTypes, Types, Stages, Religion, Areas, Cities, Orders, SchoolStatuses,
    ProgramStatuses, ContactsStatuses, GuidesStatuses, ProfessionTypes,
    setRoles, setYears, setProductTypes, setTypes, setStages, setReligion, setAreas, setCities, setOrders,
    setSchoolStatuses, setProgramStatuses, setContactsStatuses, setGuidesStatuses, setProfessionTypes,
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
    map.set('ProfessionTypes', { data: ProfessionTypes, setter: setProfessionTypes });
    return map;
  }, [Roles, Years, ProductTypes, Types, Stages, Religion, Areas, Cities, Orders, SchoolStatuses, ContactsStatuses, ProgramStatuses, GuidesStatuses, ProfessionTypes]);

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
      const existingNames = new Set(options.map(opt => opt.label));
      const selectedNames = new Set(selectedOptions.map(opt => opt.label));

      const namesToAdd = [...selectedNames].filter(name => !existingNames.has(name));
      const namesToRemove = [...existingNames].filter(name => !selectedNames.has(name));

      let insertedData = [];
      let updatedData = [];

      if (namesToAdd.length > 0) {
        // הזרקת ה-FieldName הייחודי לתוך פונקציית ההוספה
        insertedData = await insertNamesIntoCollection(
          collectionName,
          idFieldName,
          nameFieldName,
          namesToAdd,
          additionalFields // ← שולח את ה-FieldName הייחודי למונגו
        );
      }

      if (namesToRemove.length > 0) {
        updatedData = await deleteNamesFromCollection(
          collectionName,
          nameFieldName,
          insertedData.length > 0 ? [...insertedData.map((val: any)=>val[nameFieldName]), ...Array.from(existingNames)] : Array.from(existingNames),
          namesToRemove,
          idFieldName
        );
      }

      const fieldName = MapFromTableToField.get(collectionName);
      if (!fieldName) return;

      let updatedList = namesToRemove.length > 0 ? updatedData : [...insertedData, ...data];
      updatedList = updatedList.sort((a, b) => a[nameFieldName].localeCompare(b[nameFieldName], 'he'));

      updateStorage({ [fieldName]: updatedList });
      setData(updatedList);

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
        formatCreateLabel={(inputValue) => `הוסף "${inputValue}"`}
      />
      <br />
      <Button onClick={handleUpdateCollection} className="submit-button">
        עדכן טבלה
      </Button>
    </div>
  );
};

export default AddNamesForm;