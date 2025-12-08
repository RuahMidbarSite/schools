import { useState } from 'react';

import { Typeahead } from 'react-bootstrap-typeahead';

const SearchBar = ({ barName, placeholder = '', setter = _ => {}, options, labelKey = val => `${val}`, menuItemAddition = _ => '', noChangeWhenNoneSelected = false,
    defaultSelected, defaultInputValue, noneSelectedValue = '', width = null, detectInputChanges = false, className, style : styleProp }) => {

    // Should the menu show all options
    const [showAll, setShowAll] = useState(true);

    const extraProps = {};

    if (className) {
        extraProps.className = className;
    }

    if (defaultSelected) {
        extraProps.defaultSelected = [defaultSelected];
    }

    if (defaultInputValue) {
        extraProps.defaultInputValue = defaultInputValue;
    }

    if (showAll) {
        extraProps.filterBy = (_option, _props) => true;
    }

    // If any change to the value of the input be detected, than use the "onInputChange" prop (together with "onChange" in order to detect selections as well).
    if (detectInputChanges) {
        extraProps.onInputChange = input => {
            setter(input);
        }
    }

    const style = styleProp ? {...styleProp, display: 'inline-block'} : {display: 'inline-block'};
    if (width) {
        style.width = width;
    }



    return (
        <Typeahead
            style={style}
            id={barName + '-typeahead'}
            placeholder={placeholder}
            labelKey={labelKey}
            options={options}
            onChange={selectionArr => {
                if (selectionArr.length !== 0) {
                    setter(selectionArr[0]);
                    setShowAll(true);
                } else if (!noChangeWhenNoneSelected && !detectInputChanges) {
                    setter(noneSelectedValue);
                }
            }}
            renderMenuItemChildren={(option, _props, _index) => (
                <>
                    <span style={{float: 'right'}}>
                        {labelKey(option)}
                    </span>
                    <span
                        style={{float: 'left'}}
                        onClick={e => {e.preventDefault(); e.stopPropagation();}}
                    >
                        {menuItemAddition(option)}
                    </span>
                </>
            )}
            onFocus={_e => {setShowAll(true);}}
            onKeyDown={_e => {setShowAll(false);}}
            {...extraProps}
        />
    );
};

export default SearchBar;