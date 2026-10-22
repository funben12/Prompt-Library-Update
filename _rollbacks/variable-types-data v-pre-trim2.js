/* Variable types: one definition per type, shared by the desktop app and the phone app.
   Source of truth: static/variable-types-data.js in Prompt Library Pro.
   Phone copy: assets/variable-types-data.js, written by scripts/sync-vartypes-data.js. Do not edit the copy.
   Data only, no behaviour. options: none | list | pairs | weights | range | steps.
   motion.style: none | pop | spring | follow | fan | draw | roll | tumble | morph | slide | flip | spin.
   motion.speed is 0.5 to 2, motion.intensity is 0 to 1. Missing values use the global motion block. */
window.PL_VARTYPES = {
  version: 1,
  motion: { speed: 1, intensity: 0.6 },
  groups: [
    { id: 'text', label: 'Text', types: ['text', 'paragraph', 'code', 'list', 'language'] },
    { id: 'choice', label: 'Choice', types: ['dropdown', 'choicechips', 'togglegroup', 'checkbox', 'combobox', 'stepslider', 'switch', 'tags'] },
    { id: 'number', label: 'Number', types: ['number', 'percentage', 'slider', 'rangeslider', 'rating'] },
    { id: 'date', label: 'Date', types: ['date', 'daterange'] },
    { id: 'random', label: 'Random', types: ['dice', 'weightedmix', 'carddeck', 'randompick', 'randomnumber', 'coinflip', 'spinwheel'] }
  ],
  types: {
    text: { label: 'Text', icon: 'abc', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'none' } },
    paragraph: { label: 'Paragraph', icon: 'subject', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'none' } },
    code: { label: 'Code', icon: 'code', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'none' } },
    list: { label: 'List (bullets)', icon: 'format_list_bulleted', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'none' } },
    language: { label: 'Language', icon: 'translate', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'none' } },
    dropdown: { label: 'Dropdown', icon: 'arrow_drop_down', options: 'list', random: false, hint: 'Options, comma separated', defaults: {}, motion: { style: 'none' } },
    choicechips: { label: 'Choice chips (compact)', icon: 'apps', options: 'list', random: false, hint: 'Options, comma separated', defaults: {}, motion: { style: 'pop', speed: 1, intensity: 0.6 } },
    togglegroup: { label: 'Toggle group (optional descriptions)', icon: 'view_week', options: 'pairs', random: false, hint: 'One per line: Title | optional description', defaults: {}, motion: { style: 'slide', speed: 1, intensity: 0.6 } },
    checkbox: { label: 'Checkbox list', icon: 'checklist', options: 'list', random: false, hint: 'Options, comma separated', defaults: {}, motion: { style: 'draw', speed: 1, intensity: 0.6 } },
    combobox: { label: 'Combo box (pick or type)', icon: 'edit_note', options: 'list', random: false, hint: 'Options, comma separated', defaults: {}, motion: { style: 'none' } },
    switch: { label: 'Switch (two states)', icon: 'toggle_on', options: 'list', random: false, hint: 'On label, Off label (blank gives Yes, No)', defaults: {}, motion: { style: 'slide', speed: 1, intensity: 0.6 } },
    tags: { label: 'Tags (type and add)', icon: 'sell', options: 'list', random: false, hint: 'Suggested tags, comma separated (optional)', defaults: {}, motion: { style: 'pop', speed: 1, intensity: 0.6 } },
    stepslider: { label: 'Step slider', icon: 'tune', options: 'steps', random: false, hint: 'Steps in order, comma separated (at least 2)', defaults: {}, motion: { style: 'spring', speed: 1, intensity: 0.7 } },
    number: { label: 'Number', icon: 'tag', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'roll', speed: 1, intensity: 0.6 } },
    percentage: { label: 'Percentage', icon: 'percent', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'roll', speed: 1, intensity: 0.6 } },
    slider: { label: 'Slider', icon: 'linear_scale', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'follow', speed: 1, intensity: 0.6 } },
    rangeslider: { label: 'Range slider (min-max)', icon: 'linear_scale', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'follow', speed: 1, intensity: 0.6 } },
    rating: { label: 'Rating (stars)', icon: 'star', options: 'range', random: false, hint: 'Number of stars (blank gives 5)', defaults: {}, motion: { style: 'spring', speed: 1, intensity: 0.7 } },
    date: { label: 'Date', icon: 'event', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'none' } },
    daterange: { label: 'Date range', icon: 'date_range', options: 'none', random: false, hint: '', defaults: {}, motion: { style: 'none' } },
    dice: { label: 'Dice (six sided)', icon: 'casino', options: 'list', random: true, hint: 'Faces, comma separated (blank gives pips 1 to 6)', defaults: {}, motion: { style: 'tumble', speed: 1, intensity: 0.7 } },
    weightedmix: { label: 'Weighted mix (percentage sliders)', icon: 'balance', options: 'weights', random: true, hint: 'Name:percentage, comma separated (blank gives three samples)', defaults: {}, motion: { style: 'morph', speed: 1, intensity: 0.6 } },
    carddeck: { label: 'Card deck (shuffle and draw)', icon: 'style', options: 'list', random: true, hint: 'Card names, comma separated (blank gives five samples)', defaults: {}, motion: { style: 'fan', speed: 1, intensity: 0.6 } },
    randompick: { label: 'Random pick', icon: 'shuffle', options: 'list', random: true, hint: 'Options, comma separated', defaults: {}, motion: { style: 'roll', speed: 1, intensity: 0.6 } },
    coinflip: { label: 'Coin flip', icon: 'monetization_on', options: 'list', random: true, hint: 'Two sides, comma separated (blank gives Heads, Tails)', defaults: {}, motion: { style: 'flip', speed: 1, intensity: 0.7 } },
    spinwheel: { label: 'Spin wheel', icon: 'donut_large', options: 'list', random: true, hint: 'Wedges, comma separated (blank gives six samples)', defaults: {}, motion: { style: 'spin', speed: 1, intensity: 0.7 } },
    randomnumber: { label: 'Random number', icon: 'pin', options: 'range', random: true, hint: 'Min, Max (whole numbers)', defaults: {}, motion: { style: 'roll', speed: 1, intensity: 0.6 } }
  }
};
