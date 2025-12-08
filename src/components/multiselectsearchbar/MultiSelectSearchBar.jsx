import { useState } from 'react';
import { Typeahead, TypeaheadInputMulti, Token } from 'react-bootstrap-typeahead';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import 'react-bootstrap-typeahead/css/Typeahead.css';

const MultiSelectSearchBar = ({ selected, setSelected, options, placeholder='', labelKey = t => t }) => {
    // Should the menu be open
    const [open, setOpen] = useState(false);

    return (
        <DndProvider backend={HTML5Backend}>
            <Typeahead
                id="multi-select-search-bar"
                multiple
                labelKey={labelKey}
                onChange={setSelected}
                options={options}
                placeholder={placeholder}
                selected={selected}
                onKeyDown={e => {
                    setOpen(e.key !== 'Escape');
                }}
                open={open}
                onFocus={() => {setOpen(true);}}
                onBlur={() => {setOpen(false);}}
                renderInput={(inputProps, props) => (
                    <TypeaheadInputMulti
                        {...inputProps}
                        selected={selected}>
                        {selected.map(option => (
                            <Token
                                onRemove={props.onRemove}
                                option={option}
                                key={`search-bar-token-${option}`}
                            >
                                    {labelKey(option)}
                            </Token>
                        ))}
                    </TypeaheadInputMulti>
                )}
                renderMenuItemChildren={(option, _props, _index) => (
                    <>
                        <span style={{float: 'right'}}>
                            {labelKey(option)}
                        </span>
                    </>
                )}
            />
        </DndProvider>
    );
}

export default MultiSelectSearchBar;