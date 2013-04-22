var Utils = require("../../utils")

var EagerLoading = module.exports = function(QueryGenerator) {
  this.QueryGenerator = QueryGenerator
}

EagerLoading.prototype.apply = function(tableName, includes) {
  var table         = tableName
    , result        = { table: table, query: "" }
    , optAttributes = [ result.table + '.*' ]
    , joinQuery     = null

  includes.forEach(function(include) {
    var attributes = Object.keys(include.daoFactory.attributes).map(function(attr) {
      var template = Utils._.template("<%= as %>.<%= attr %> AS <%= combined %>")

      return template({
        as:       this.QueryGenerator.addQuotes(include.as),
        attr:     this.QueryGenerator.addQuotes(attr),
        combined: this.QueryGenerator.addQuotes('xxx').replace('xxx', include.as + '.' + attr)
      })
    }.bind(this))

    optAttributes = optAttributes.concat(attributes)

    var hasJunctionTable = include.association.useJunctionTable
      , connectorDAO     = include.association.connectorDAO
      , hasKeyMap        = connectorDAO && connectorDAO.__keyMap

    if (hasJunctionTable && hasKeyMap) {
      table += ", " + this.QueryGenerator.addQuotes(include.association.target.tableName)
      table += ' AS ' + this.QueryGenerator.addQuotes(include.as)

      result.table = table
      joinQuery    = " LEFT OUTER JOIN <%= table %> ON <%= table %>.<%= attrLeft %> = <%= tableRight %>.<%= attrRight %> AND <%= table %>.<%= attrLeft2 %> = <%= tableRight2 %>.<%= attrRight2 %>"

      var left      = Utils._.keys(connectorDAO.__keyMap)[0]
        , right     = Utils._.keys(connectorDAO.__keyMap)[1]

      result.query += Utils._.template(joinQuery)({
        table:       this.QueryGenerator.addQuotes(connectorDAO.tableName),
        attrLeft:    this.QueryGenerator.addQuotes(left),
        attrLeft2:   this.QueryGenerator.addQuotes(right),
        tableRight:  this.QueryGenerator.addQuotes(include.as),
        tableRight2: this.QueryGenerator.addQuotes(connectorDAO.__keyMap[right].tableName),
        attrRight:   this.QueryGenerator.addQuotes('id'),
        attrRight2:  this.QueryGenerator.addQuotes('id')
      })
    } else {
      joinQuery    = " LEFT OUTER JOIN <%= table %> AS <%= as %> ON <%= tableLeft %>.<%= attrLeft %> = <%= tableRight %>.<%= attrRight %>"
      result.query += Utils._.template(joinQuery)({
        table:      this.QueryGenerator.addQuotes(include.daoFactory.tableName),
        as:         this.QueryGenerator.addQuotes(include.as),
        tableLeft:  this.QueryGenerator.addQuotes(((include.association.associationType === 'BelongsTo') ? include.as : tableName)),
        attrLeft:   this.QueryGenerator.addQuotes('id'),
        tableRight: this.QueryGenerator.addQuotes(((include.association.associationType === 'BelongsTo') ? tableName : include.as)),
        attrRight:  this.QueryGenerator.addQuotes(include.association.identifier)
      })
    }
  }.bind(this))

  result.attributes = optAttributes.join(', ')

  return result
}
