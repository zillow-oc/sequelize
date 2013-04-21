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
      var template = Utils._.template("`<%= as %>`.`<%= attr %>` AS `<%= as %>.<%= attr %>`")
      return template({ as: include.as, attr: attr })
    })

    optAttributes = optAttributes.concat(attributes)

    var hasJunctionTable = include.association.useJunctionTable
      , connectorDAO     = include.association.connectorDAO
      , hasKeyMap        = connectorDAO && connectorDAO.__keyMap

    if (hasJunctionTable && hasKeyMap) {
      table += ", " + this.QueryGenerator.addQuotes(include.association.target.tableName)
      table += ' AS ' + this.QueryGenerator.addQuotes(include.as)

      result.table = table
      joinQuery    = " LEFT OUTER JOIN `<%= table %>` ON `<%= table %>`.`<%= attrLeft %>` = `<%= tableRight %>`.`<%= attrRight %>` AND `<%= table %>`.`<%= attrLeft2 %>` = `<%= tableRight2 %>`.`<%= attrRight2 %>`"

      var left      = Utils._.keys(connectorDAO.__keyMap)[0]
        , right     = Utils._.keys(connectorDAO.__keyMap)[1]

      result.query += Utils._.template(joinQuery)({
        table:       connectorDAO.tableName,
        attrLeft:    left,
        attrLeft2:   right,
        tableRight:  include.as,
        tableRight2: connectorDAO.__keyMap[right].tableName,
        attrRight:   'id',
        attrRight2:  'id'
      })
    } else {
      joinQuery    = " LEFT OUTER JOIN `<%= table %>` AS `<%= as %>` ON `<%= tableLeft %>`.`<%= attrLeft %>` = `<%= tableRight %>`.`<%= attrRight %>`"
      result.query += Utils._.template(joinQuery)({
        table:      include.daoFactory.tableName,
        as:         include.as,
        tableLeft:  ((include.association.associationType === 'BelongsTo') ? include.as : this.QueryGenerator.removeQuotes(tableName)),
        attrLeft:   'id',
        tableRight: ((include.association.associationType === 'BelongsTo') ? this.QueryGenerator.removeQuotes(tableName) : include.as),
        attrRight:  include.association.identifier
      })
    }
  }.bind(this))

  result.attributes = optAttributes.join(', ')

  return result
}
