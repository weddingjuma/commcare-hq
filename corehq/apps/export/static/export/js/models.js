var Exports = {
    ViewModels: {},
    Constants: {}
};

Exports.ViewModels.ExportInstance = function(instanceJSON) {
    var self = this;
    ko.mapping.fromJS(instanceJSON, Exports.ViewModels.ExportInstance.mapping, self);
};

Exports.ViewModels.ExportInstance.mapping = {
    include: [
        'name',
        'tables',
        'type',
        'export_format',
        'split_multiselects',
        'transform_dates',
        'include_errors',
        'is_deidentified',
    ],
    tables: {
        create: function(options) {
            return new Exports.ViewModels.TableConfiguration(options.data);
        }
    }
};

Exports.ViewModels.TableConfiguration = function(tableJSON) {
    var self = this;
    ko.mapping.fromJS(tableJSON, Exports.ViewModels.TableConfiguration.mapping, self);
};

Exports.ViewModels.TableConfiguration.prototype.isVisible = function() {
    // Not implemented
    return true;
};

Exports.ViewModels.TableConfiguration.prototype.showDeleted = function() {
    // Not implemented
    return true;
};

Exports.ViewModels.TableConfiguration.mapping = {
    include: ['name', 'path', 'columns', 'selected'],
    tables: {
        create: function(options) {
            return new Exports.ViewModels.ExportColumn(options.data);
        }
    }
};

Exports.ViewModels.ExportColumn = function(columnJSON) {
    var self = this;
    ko.mapping.fromJS(columnJSON, Exports.ViewModels.ExportColumn.mapping, self);
};

Exports.ViewModels.ExportColumn.mapping = {
    include: ['item', 'label', 'show', 'selected'],
    item: {
        create: function(options) {
            return new Exports.ViewModels.ExportItem(options.data);
        }
    }
};

Exports.ViewModels.ExportItem = function(itemJSON) {
    // ExportItem is not modifyable through the UI so we should not make it observable
    var self = this;
    self.path = itemJSON.path;
    self.label = itemJSON.label;
    self.tag = itemJSON.tag;
};

Exports.ViewModels.ExportItem.prototype.isCaseName = function() {
    return self.path[self.path.length - 1] === 'case_name';
};
