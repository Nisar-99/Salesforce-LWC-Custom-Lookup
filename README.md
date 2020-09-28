## Salesforce LWC Custom Lookup

Lookup is an autocomplete combobox that will search against a database object.
The lookup can parse through `single` or `multi` scoped datasets. The parsed dataset can be filtered by single or multi option selects.



### Parameters

| Names | Default | Required | Description |
| :--- | :--- | :---: | :--- |
| `label` |  |  :x: | Being used for input label. |
| `placeholder` | `Search...` | :x: | Being used for input place holder. |
| `object-label` | optional | :x: | Being used for input new record create title and new record modal header. required when `is-creatable` is implemented.|
| `object-api-name` |  | :heavy_check_mark: | API Name of the object from where to fetch the record. |
| `field-api-name` |  | :heavy_check_mark: | `Primary` Field API Name.  |
| `sub-field-api-name` | optional | :x: | `Secondary` Field API Name. |
| `icon-name` | `standard:default` | :x: | Which icon do you want to show (i.g: `standard:account`)  |
| `limit` | `5` | :x: | How many records will be shown to you in the dropdown |
| `is-multi-select` | `false` | :x: | When you want multiple records selected. |
| `is-creatable` | `false` | :x: | create new records.|
| `required` | `false` | :x: | make the input required |
| `read-only` | `false` | :x: | make the input read only |

### Events

| Names | Values  | Description |
| :--- | :--- | :--- |
| `onselect` | `event.detail` | Get the selected values ​​as `array`. i.g `[{id: "0016F00003ipPdOQAU", title: "Demo", subtitle: "demo@test.com"}]`|



#### Usage

`Html:`

```html
<c-lookup
  label="Contact"
  placeholder="Search..."
  object-api-name="Contact"
  field-api-name="Name"
  icon-name="standard:contact"
  onselect={handleSelected}
  ></c-lookup>
```
`JavaScript:`

```js
handleSelected(event) {
    console.log('OUTPUT : ', JSON.parse(JSON.stringify(event.detail)));
    //Output: [{id: "0016F00003ipPdOQAU", title: "Demo", subtitle: "demo@test.com"}]
}
```


**Creatable and Multi-Select**

```html
<c-lookup
  label="Student"
  placeholder="Search..."
  object-label="Students"
  object-api-name="Student__c"
  field-api-name="Student_Name__c"
  sub-field-api-name="Email__c"
  icon-name="standard:user"
  limit="7"
  is-multi-select
  is-creatable
  required
  onselect={handleSelected}
  ></c-lookup>
```

**Default value**

`Html:`

```html
<c-lookup
  label="Account"
  placeholder="Search..."
  object-api-name="Account"
  field-api-name="Name"
  value={defaultValue}
  icon-name="standard:account"
  onselect={handleSelected}
  ></c-lookup>
```

`JavaScript:`

```js
//Single Value
@track defaultValue = [{id: "0016F00003ipPdOQAU", title: "Demo", subtitle: "demo@test.com"}];

/* if you have Multi select lookup
*@track defaultValue = [{id: "0016F00003ipPdOQAU", title: "Demo", subtitle: "demo@test.com"},
                        {id: "0016F00003ipPdORAU", title: "Test", subtitle: "test@test.com"}];
*/

handleSelected(event) {
    console.log('OUTPUT : ', JSON.parse(JSON.stringify(event.detail)));
    //Output: [{id: "0016F00003ipPdOQAU", title: "Demo", subtitle: "demo@test.com"}]
}
```

**Notes:**

>When Lookup with Created mode: the `Event` and `Task` objects are not supported. This limitation also applies to a record that references a field that belongs to an unsupported object.
External objects are not supported.

**More:**

 * [Salesforce Assistant](https://chrome.google.com/webstore/detail/salesforce-assistant/acpngnlieelljdlljmenkagbonaicccj)
 * [Salesforce Lightning code snippets](https://marketplace.visualstudio.com/items?itemName=Nik-Creation.lwc-salesforce)

Thank you...
