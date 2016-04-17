
var cssstats = require('cssstats');
var beautify = require('cssbeautify');
var camelCase = require('camel-case')
var _ = require('lodash');


function parseTotals(stats) {

  if (!stats) return false;

  stats.declarations.properties.total = _.size(stats.declarations.properties);

  var totals = {};
  var totalProperties = ['float', 'width', 'height', 'color', 'background-color'];
  for(var property of totalProperties) {
    totals[camelCase(property)] = stats.declarations.properties[property].length;
  }

  totals.fontSize = stats.declarations.getAllFontSizes().length;

  return totals;
}

function parseUniques(stats) {

  if (!stats) return false;

  var uniques = {};
  var uniqueProperties = ['width', 'height', 'color', 'background-color',
    'margin', 'padding', 'border-radius'];
  for(var property of uniqueProperties) {
    uniques[camelCase(property)] = _.uniq(stats.declarations.properties[property]);
  }

  uniques.fontSize = _.uniq(stats.declarations.getAllFontSizes());
  uniques.fontFamily = _.uniq(stats.declarations.getAllFontFamilies());
  uniques.fontSizeSorted = sortFontSizes(uniques.fontSize);

  return uniques;

}

function parseSpecificity(selectors) {
  if (!selectors.length) return;
  var array = [];
  selectors.forEach(function(selector) {
    array.push(selector.specificity_10);
  });
  return array;
}

function fontSizeToPx(value) {
  var raw;

  if (typeof value !== 'string') {
    value = value.toString();
  }

  raw = parseFloat(value, 10);
  if (value.match(/px$/)) {
    return raw;
  }
  if (value.match(/em$/)) {
    return raw * 16;
  }
  if (value.match(/%$/)) {
    return raw * .16;
  }
  switch (value) {
    case 'inherit':
      return 16;
    case 'xx-small':
      return 9;
    case 'x-small':
      return 10;
    case 'small':
      return 13;
    case 'medium':
      return 16;
    case 'large':
      return 18;
    case 'x-large':
      return 24;
    case 'xx-large':
      return 32;
    case 'small':
      return 13;
    case 'larger':
      return 19;
    default:
      return 1024;
  }
}

function sortFontSizes(fontSizes) {
  var sortBy = function(a, b) {
    c = fontSizeToPx(a);
    d = fontSizeToPx(b);
    if (c > d) {
      return -1;
    } else {
      return 1;
    }
  }
  var sorted = fontSizes;
  if (!sorted) return false;
  return sorted.sort(sortBy);
}

function parsePropertiesBreakdown(stats) {
  if (!stats) return false;
  var result = [];
  var total = stats.declarations.all.length;
  var properties = stats.aggregates.properties;
  var otherSum = 0;
  if (!properties.length) return false;
  properties.forEach(function(property) {
    var obj = {};
    obj.property = property;
    obj.percentage = (stats.declarations.byProperty[property].length / total * 100);
    if (obj.percentage < 2) {
      otherSum += obj.percentage;
    } else {
      result.push(obj);
    }
  });
  if (!result.length) return false;
  result = result.sort(function(a,b) { return b.percentage - a.percentage });
  result.push({ property: 'other', percentage: otherSum });
  result.forEach(function(property) {
    property.percentagePretty = property.percentage.toFixed(2);
  });
  return result;
}

function uniquesGraph(stats) {
  var obj = {};
  obj.max = 0;
  var keys = ['width', 'height', 'margin', 'padding', 'color', 'background-color'];
  keys.forEach(function(key) {
    camelKey = camelCase(key);
    obj[camelKey] = {};
    if (!stats.declarations.properties[key]) {
      obj[camelKey].total = 0;
      obj[camelKey].unique = 0;
    } else {
      obj[camelKey].total = stats.declarations.properties[key].length;
      obj[camelKey].unique = stats.declarations.getUniquePropertyCount(key);
      if (obj[camelKey].total > obj.max) {
        obj.max = obj[camelKey].total;
      }
    }
  });
  keys.forEach(function(key) {
    if (!obj[camelKey]) return false;
    obj[camelKey].percentTotal = obj[camelKey].total / obj.max;
    obj[camelKey].percentUnique = obj[camelKey].unique / obj.max;
  });
  return obj;
}

function rulesizeGraph(rules) {
  var array = [];
  rules.forEach(function(rule) {
    if (!rule.declarations) return false;
    array.push(rule.declarations.length);
  });
  return array;
}

module.exports = function(obj) {

  var model = obj;
  model.cssPretty = beautify(obj.css);

  model.stats = cssstats(obj.css, {
    safe: true
  });
  if (!model.stats) {
    console.log('no stats');
  }

  model.totals = parseTotals(model.stats);
  model.uniques = parseUniques(model.stats);
  model.uniquesGraph = uniquesGraph(model.stats);
  model.specificityGraph = model.stats.selectors.getSpecificityGraph();
  model.rulesizeGraph = model.stats.rules.size.graph;
  model.mediaQueries = _.uniq(model.stats.mediaQueries.values);

  return model;

};
