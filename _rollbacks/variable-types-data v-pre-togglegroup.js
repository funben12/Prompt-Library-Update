/* Variable types: one definition per type, shared by the desktop app and the phone app.
   Source of truth: static/variable-types-data.js in Prompt Library Pro.
   Phone copy: assets/variable-types-data.js, written by scripts/sync-vartypes-data.js. Do not edit the copy.
   Data only, no behaviour. options: none | list | pairs | weights | range | steps.
   motion.style: none | pop | spring | follow | fan | draw | roll | tumble | morph.
   motion.speed is 0.5 to 2, motion.intensity is 0 to 1. Missing values use the global motion block. */
window.PL_VARTYPES = {
  version: 1,
  motion: { speed: 1, intensity: 0.6 },
  groups: [
    { id: 'text', label: 'Text', types: ['text', 'paragraph', 'code', 'list', 'language'] },
    { id: 'choice', label: 'Choice', types: ['dropdown', 'choicechips', 'choicecards', 'checkbox', 'combobox', 'stepslider'] },
    { id: 'number', label: 'Number', types: ['number', 'percentage', 'slider', 'rangeslider'] },
    { id: 'date', label: 'Date', types: ['date', 'daterange'] },
    { id: 'random', label: 'Random', types: ['diceroll', 'weightedmix', 'carddeck', 'randompick', 'randomnumber'] }
  ],
  types: {
    text: { label: 'Text', icon: 'abc', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'none' } },
    paragraph: { label: 'Paragraph', icon: 'subject', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'none' } },
    code: { label: 'Code', icon: 'code', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'none' } },
    list: { label: 'List (bullets)', icon: 'format_list_bulleted', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'none' } },
    language: { label: 'Language', icon: 'translate', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'none' } },
    dropdown: { label: 'Dropdown', icon: 'arrow_drop_down', options: 'list', random: false, hint: 'Options, comma separated', defaults: {}, motion: { style: 'none' } },
    choicechips: { label: 'Choice chips (compact)', icon: 'apps', options: 'list', random: false, hint: 'Options, comma separated', defaults: {}, motion: { style: 'pop', speed: 1, intensity: 0.6 } },
    choicecards: { label: 'Choice cards (title and description)', icon: 'view_agenda', options: 'pairs', random: false, hint: 'One card per line: Title | short description', defaults: {}, motion: { style: 'pop', speed: 1, intensity: 0.5 } },
    checkbox: { label: 'Checkbox list', icon: 'checklist', options: 'list', random: false, hint: 'Options, comma separated', defaults: {}, motion: { style: 'draw', speed: 1, intensity: 0.6 } },
    combobox: { label: 'Combo box (pick or type)', icon: 'edit_note', options: 'list', random: false, hint: 'Options, comma separated', defaults: {}, motion: { style: 'none' } },
    stepslider: { label: 'Step slider', icon: 'tune', options: 'steps', random: false, hint: 'Steps in order, comma separated (at least 2)', defaults: {}, motion: { style: 'spring', speed: 1, intensity: 0.7 } },
    number: { label: 'Number', icon: 'tag', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'roll', speed: 1, intensity: 0.6 } },
    percentage: { label: 'Percentage', icon: 'percent', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'roll', speed: 1, intensity: 0.6 } },
    slider: { label: 'Slider', icon: 'linear_scale', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'follow', speed: 1, intensity: 0.6 } },
    rangeslider: { label: 'Range slider (min-max)', icon: 'linear_scale', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'follow', speed: 1, intensity: 0.6 } },
    date: { label: 'Date', icon: 'event', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'none' } },
    daterange: { label: 'Date range', icon: 'date_range', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'none' } },
    diceroll: { label: 'Dice roll (rolling die)', icon: 'casino', options: 'list', random: true, hint: 'Custom faces, words or numbers (blank uses the sides above)', defaults: { faces: 12 }, motion: { style: 'roll', speed: 5, intensity: 0.7 } },
    weightedmix: { label: 'Weighted mix (percentage sliders)', icon: 'balance', options: 'weights', random: true, hint: 'Name:percentage, comma separated (blank gives three samples)', defaults: {}, motion: { style: 'morph', speed: 1, intensity: 0.6 } },
    carddeck: { label: 'Card deck (shuffle and draw)', icon: 'style', options: 'list', random: true, hint: 'Card names, comma separated (blank gives five samples)', defaults: {}, motion: { style: 'fan', speed: 1, intensity: 0.6 } },
    randompick: { label: 'Random pick', icon: 'shuffle', options: 'list', random: true, hint: 'Options, comma separated', defaults: {}, motion: { style: 'roll', speed: 1, intensity: 0.6 } },
    randomnumber: { label: 'Random number', icon: 'pin', options: 'range', random: true, hint: 'Min, Max (whole numbers)', defaults: {}, motion: { style: 'roll', speed: 1, intensity: 0.6 } }
  }
};
