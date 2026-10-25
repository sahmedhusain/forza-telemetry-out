const {test}=require('node:test');const assert=require('node:assert/strict');
const {translations,languageRows}=require('../public/js/i18n');
test('every supported translation is present for each core interface label',()=>{for(const lang of ['ar','es','fr'])for(const key of new Set([...languageRows.map(([key])=>key),...Object.keys(translations.ar),...Object.keys(translations.es),...Object.keys(translations.fr)])){assert.equal(typeof translations[lang][key],'string');assert.ok(translations[lang][key].length>0,key);}});
