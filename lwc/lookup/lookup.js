import { LightningElement, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import searchLookupRecords from '@salesforce/apex/LookupController.searchLookupRecords'; // Apex method 
import getRecentlyCreatedRecord from '@salesforce/apex/LookupController.getRecentlyCreatedRecord'; // Apex method 

const MINIMAL_SEARCH_TERM_LENGTH = 1; // Min number of chars required to search
const SEARCH_DELAY = 300; // Wait 300 ms after user stops typing then, peform search
const HAS_FOCUS = 'slds-has-focus';
const DEFAULT_ICON = 'standard:default';
const KEYS = { ENTER: 13, ARROW_UP: 38, ARROW_DOWN: 40 };

export default class Lookup extends LightningElement {

    @api label; // Being used for input label.
    @api placeholder = 'Search...'; // Being used for input place holder.
    @api objectLabel; // Being used for input new record create title and new record modal header.
    @api objectApiName; // API Name of the object from where to fetch the record. (Required)
    @api fieldApiName; // Field API Name (Primary and Required)
    @api subFieldApiName; //Sub Field API Name (Secondary and Optional) 
    @api limit = 5; //Limit of records showing (Optional) 
    @api iconName = DEFAULT_ICON; // Icon Name (i.g: standard:account) 
    @api isMultiSelect = false;
    @api isCreatable = false;
    @api required = false;
    @api readOnly = false;
    
    @api selection = [];
    @api errors = [];

    /* How to pass default value
    *  value = [{ id: "", title: "", subtitle: ""}]
    */
    
    // Private
    @track searchTerm = '';
    @track searchResults = [];
    @track hasFocus = false;
    @track isNewRecordForm = false;
    @track noRecordFound = false;

    cleanSearchTerm;
    blurTimeout;
    searchThrottlingTimeout;
    focusIndex = -1;

    // EXPOSED FUNCTIONS
    @api get value() {
        return this.value;
    }
    set value(data) {
        if (data) {
            this.selection = JSON.parse(JSON.stringify(data));
        } else {
            this.selection = [];
        }
    }

    @api
    getSelection() {
        return this.selection;
    }

    get labelOfObject() {
        return (this.objectLabel ? this.objectLabel : (this.objectApiName ? this.objectApiName : 'Record'));
    }

    closeModal() {
        this.isNewRecordForm = false;
    }


    handleSuccess(event) {

        this.notifyUser('Success', "Successfully created " + this.labelOfObject, 'success');

        const params = {
            'sObjectName': this.objectApiName,
            'recordId' : event.detail.id,
            'field': this.fieldApiName,
            'subField': this.subFieldApiName
        }
        getRecentlyCreatedRecord(JSON.parse(JSON.stringify(params))).then(result => {
            this.isNewRecordForm = false;
            const newSelection = [...this.selection];
            newSelection.push(result);
            this.selection = newSelection;
            // Reset search
            this.searchTerm = '';
            this.searchResults = [];
            // Notify parent components that selection has changed
            this.selectionValueEvt();
          }).catch(error => {
            this.isNewRecordForm = false;
            this.notifyUser('Error', error.body.message || error.message, 'Error');
        });
       
    }

    // INTERNAL FUNCTIONS

    updateSearchTerm(newSearchTerm) {
        this.clearFocus();
        this.searchTerm = newSearchTerm;

        // Compare clean new search term with current one and abort if identical
        const newCleanSearchTerm = newSearchTerm.trim().replace(/\*/g, '').toLowerCase();
        if (this.cleanSearchTerm === newCleanSearchTerm) {
            return;
        }

        // Save clean search term
        this.cleanSearchTerm = newCleanSearchTerm;

        // Ignore search terms that are too small
        if (newCleanSearchTerm.length < MINIMAL_SEARCH_TERM_LENGTH) {
            this.searchResults = [];
            return;
        }

        // Apply search throttling (prevents search if user is still typing)
        if (this.searchThrottlingTimeout) {
            clearTimeout(this.searchThrottlingTimeout);
        }
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this.searchThrottlingTimeout = setTimeout((self) => {
                // Send search event if search term is long enougth
                if (self.cleanSearchTerm.length >= MINIMAL_SEARCH_TERM_LENGTH) {
                    self.handleSearch(self.cleanSearchTerm, self.selection.map(element => element.id));
                }
                this.searchThrottlingTimeout = null;
            },SEARCH_DELAY, this);
    }

    //apex logic
    handleSearch(searchTerm, selectedIds) {
        const parameters = {
            'searchTerm': searchTerm,
            'selectedIds': selectedIds,
            'sObjectName': this.objectApiName,
            'field': this.fieldApiName,
            'subField': this.subFieldApiName,
            'maxResults': this.limit
        }
        searchLookupRecords(JSON.parse(JSON.stringify(parameters))).then(results => {
            this.searchResults = results;
            this.noRecordFound = (results.length == 0);
        }).catch(error => {
            this.notifyUser('Lookup Error', 'An error occured while searching with the lookup field.', 'error');
            console.error('Lookup error', JSON.stringify(error));
            this.errors = [error];
        });
    }

    isSelectionAllowed() {
        if (this.isMultiSelect) {
            return true;
        }
        return !this.hasSelection();
    }

    hasResults() {
        return this.searchResults.length > 0;
    }

    hasSelection() {
        return this.selection.length > 0;
    }

    // EVENT HANDLING

    handleInput(event) {
        // Prevent action if selection is not allowed
        if (!this.isSelectionAllowed()) {
            return;
        }
        this.noRecordFound = false;
        this.updateSearchTerm(event.target.value);
    }

    saveLookupSelection(recordId) {
        if (recordId == 'create-new') {
            this.isNewRecordForm = this.isCreatable;
        } else {
            // Save selection
            let selectedItem = this.searchResults.filter(result => result.id === recordId);
            if (selectedItem.length === 0) {
                return;
            }
            selectedItem = selectedItem[0];
            const newSelection = [...this.selection];
            newSelection.push(selectedItem);
            this.selection = newSelection;
            // Reset search
            this.searchTerm = '';
            this.searchResults = [];
            // Notify parent components that selection has changed
            this.selectionValueEvt();
        }
    }

    handleResultEnter() {
        const dropdown = [...this.template.querySelectorAll('.dropdown')];
        if (dropdown && dropdown.length) {
            this.template.querySelector('input').blur();
            this.saveLookupSelection(dropdown[this.focusIndex].dataset.recordId);
        }
    }

    handleResultClick(event) {
        this.saveLookupSelection(event.currentTarget.dataset.recordid);
    }

    handleComboboxClick() {
        // Hide combobox immediatly
        if (this.blurTimeout) {
            window.clearTimeout(this.blurTimeout);
        }
        this.hasFocus = false;
    }

    handleFocus() {
        // Prevent action if selection is not allowed
        if (!this.isSelectionAllowed()) {
            return;
        }
        [...this.template.querySelectorAll('.dropdown')].map(li => li.firstChild.classList.remove(HAS_FOCUS));
        this.focusIndex = -1;
        this.hasFocus = true;
    }

    handleBlur() {
        // Prevent action if selection is not allowed
        if (!this.isSelectionAllowed()) {
            return;
        }
        // Delay hiding combobox so that we can capture selected result
        this.blurTimeout = window.setTimeout((self) => {
            self.hasFocus = false;
            self.blurTimeout = null;
        }, 300, this);
    }

    handleRemoveSelectedItem(event) {
        const recordId = event.currentTarget.name;
        this.selection = this.selection.filter(item => item.id !== recordId);
        this.selectionValueEvt();
    }

    handleClearSelection() {
        this.selection = [];
        // Notify parent components that selection has changed
        this.selectionValueEvt();
    }

    selectionValueEvt() {
        const selected = new CustomEvent('select', {
            detail: JSON.parse(JSON.stringify(this.selection))
        });
        this.dispatchEvent(selected);
        this.errors = [];
    }

    arrowNavigationUp(event) {
        if (!this.isSelectionAllowed()) {
            return;
        }
        if (this.hasFocus && (this.hasResults() || this.noRecordFound) && event.which === KEYS.ARROW_UP) {
            const dropdown = [...this.template.querySelectorAll('.dropdown')];
            dropdown.map(li => li.firstChild.classList.remove(HAS_FOCUS));
            const itemCount = (dropdown.length - 1);
            if (this.focusIndex !== -1) {
                if (itemCount !== (this.focusIndex + itemCount)) {
                    if (this.focusIndex) {
                        --this.focusIndex;
                    } else {
                        this.focusIndex = itemCount;
                    }
                } else if (this.focusIndex === 1) {
                    this.focusIndex = 0;
                } else if (itemCount === (this.focusIndex + itemCount)) {
                    this.focusIndex = itemCount;
                }
            } else {
                this.focusIndex = itemCount;
            }
            dropdown[this.focusIndex].firstChild.classList.add(HAS_FOCUS);

        } else if (event.which === KEYS.ENTER && this.focusIndex !== -1) {
            this.handleResultEnter();
        }
    }

    arrowNavigationDown(event) {
        if (!this.isSelectionAllowed()) {
            return;
        }
        if (this.hasFocus && (this.hasResults() || this.noRecordFound) && event.which === KEYS.ARROW_DOWN) {
            const dropdown = [...this.template.querySelectorAll('.dropdown')];
            const itemCount = (dropdown.length - 1);
            if (itemCount !== this.focusIndex) {
                (this.focusIndex !== -1) ? dropdown[this.focusIndex].firstChild.classList.remove(HAS_FOCUS): null;
                dropdown[++this.focusIndex].firstChild.classList.add(HAS_FOCUS);
            } else if (itemCount === this.focusIndex) {
                dropdown[this.focusIndex].firstChild.classList.remove(HAS_FOCUS);
                this.focusIndex = 0;
                dropdown[this.focusIndex].firstChild.classList.add(HAS_FOCUS);
            }
        }
    }

    clearFocus() {
        if (this.focusIndex === -1) return;
        this.focusIndex = -1;
        [...this.template.querySelectorAll('.dropdown')].map(li => li.firstChild.classList.remove(HAS_FOCUS));
    }

    notifyUser(title, message, variant) {
        const toastEvent = new ShowToastEvent({ title, message, variant });
        this.dispatchEvent(toastEvent);
    }


    // STYLE EXPRESSIONS

    get getContainerClass() {
        let css = 'slds-combobox_container slds-has-inline-listbox ';
        if (this.hasFocus && this.hasResults()) {
            css += 'slds-has-input-focus ';
        }
        if (this.errors.length > 0) {
            css += 'has-custom-error';
        }
        return css;
    }

    get getDropdownClass() {
        let css = 'slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click ';
        if (this.hasFocus && (this.hasResults() || this.noRecordFound)) {
            css += 'slds-is-open';
        } else {
            css += 'slds-combobox-lookup';
        }
        return css;
    }

    get getInputClass() {
        let css = 'slds-input slds-combobox__input has-custom-height ' +
            (this.errors.length === 0 ? '' : 'has-custom-error ');
        if (!this.isMultiSelect) {
            css += (this.hasSelection() ? 'slds-combobox__input-value has-custom-border' : '');
        }
        return css;
    }

    get getComboboxClass() {
        let css = 'slds-combobox__form-element slds-input-has-icon ';
        if (this.isMultiSelect) {
            css += 'slds-input-has-icon_right';
        } else {
            css += (this.hasSelection() ? 'slds-input-has-icon_left-right' : 'slds-input-has-icon_right');
        }
        return css;
    }

    get getSearchIconClass() {
        let css = 'slds-input__icon slds-input__icon_right ';
        if (!this.isMultiSelect) {
            css += (this.hasSelection() ? 'slds-hide' : '');
        }
        return css;
    }

    get getClearSelectionButtonClass() {
        return 'slds-button slds-button_icon slds-input__icon slds-input__icon_right ' +
            (this.hasSelection() ? '' : 'slds-hide');
    }

    get getSelectIconName() {
        return this.hasSelection() ? this.iconName : DEFAULT_ICON;
    }

    get getSelectIconClass() {
        return 'slds-combobox__input-entity-icon ' +
            (this.hasSelection() ? '' : 'slds-hide');
    }

    get getInputValue() {
        if (this.isMultiSelect) {
            return this.searchTerm;
        }
        return this.hasSelection() ? this.selection[0].title : this.searchTerm;
    }

    get getListboxClass() {
        return 'slds-listbox slds-listbox_vertical slds-dropdown slds-dropdown_fluid ';
    }

    get pillsContainer() {
        return (this.isMultiSelect && this.hasSelection()) ? 'slds-listbox_selection-group selectionGroup' : '';
    }

    get isInputReadonly() {
        if (this.isMultiSelect) {
            return false;
        }
        return this.hasSelection();
    }

    get isExpanded() {
        return this.hasResults();
    }
}