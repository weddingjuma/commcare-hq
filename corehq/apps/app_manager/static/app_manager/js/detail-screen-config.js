/*globals $, _, uiElement, eventize, lcsMerge */

var DetailScreenConfig = (function () {
    "use strict";
    var DetailScreenConfig, Screen, Column;
    function formatEnum(obj) {
        var key, parts = [];
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                parts.push(key + '=' + obj[key]);
            }
        }
        return parts.join(', ');
    }
    function unformatEnum(text) {
        var json;
        text = text.replace('\n', ' ').replace(/^\s*/, '').replace(/\s*$/, '');
        if (text) {
            json = '{"' +
                text.replace(/\s*=\s*/g, '":"').
                replace(/\s*,\s*/g, '","') +
                '"}';
            return JSON.parse(json);
        } else {
            return {};
        }
    }
    Column = (function () {
        function Column(col, screen) {
            /*
                column properites: model, field, header, format
                column extras: enum
            */
            var that = this, elements, i;
            eventize(this);
            this.original = JSON.parse(JSON.stringify(col));

            function orDefault(value, d) {
                if (value === undefined) {
                    return d;
                } else {
                    return value;
                }
            }

            this.original.model = this.original.model || "case";
            this.original.field = this.original.field || "";
            this.original.header = this.original.header || {};
            this.original.format = this.original.format || "plain";
            this.original['enum'] = this.original['enum'] || {};
            this.original.late_flag = this.original.late_flag || 30;

            this.screen = screen;
            this.lang = screen.lang;

            this.includeInShort = uiElement.checkbox().val(orDefault(this.original.includeInShort, true));
            this.includeInLong = uiElement.checkbox().val(orDefault(this.original.includeInLong, true));

            this.model = uiElement.select([
                {label: "Case", value: "case"},
                {label: "Referral", value: "referral"}
            ]).val(this.original.model);
            this.field = uiElement.input().val(this.original.field);
            this.header = uiElement.input().val(this.original.header ? this.original.header[this.lang] || "" : "");
            this.format = uiElement.select([
                {value: "plain", label: DetailScreenConfig.message.PLAIN_FORMAT},
                {value: "date", label: DetailScreenConfig.message.DATE_FORMAT},
                {value: "years-ago", label: DetailScreenConfig.message.YEARS_AGO_FORMAT},
                {value: "phone", label: DetailScreenConfig.message.PHONE_FORMAT},
                {value: "enum", label: DetailScreenConfig.message.ENUM_FORMAT},
                {value: "late-flag", label: DetailScreenConfig.message.LATE_FLAG_FORMAT}
            ]).val(this.original.format || null);

            this.enum_extra = uiElement.textarea().val(formatEnum(this.original['enum'][this.lang]) || "");
            this.enum_extra.ui.prepend($('<span/>').text(DetailScreenConfig.message.ENUM_EXTRA_LABEL));
            this.late_flag_extra = uiElement.input().val(this.original.late_flag.toString());
            this.late_flag_extra.ui.prepend($('<span/>').text(DetailScreenConfig.message.LATE_FLAG_EXTRA_LABEL));
            elements = [
                'includeInShort',
                'includeInLong',
                'model',
                'field',
                'header',
                'format',
                'enum_extra',
                'late_flag_extra'
            ];


            function fireChange() {
                that.fire('change');
            }
            
            for (i = 0; i < elements.length; i += 1) {
                this[elements[i]].on('change', fireChange);
            }

            this.$extra = $('<span/>');
            //this.setFormat(this.original.format);

            this.format.on('change', function () {
                that.$extra.find('> *').detach();
                if (this.val() === "enum") {
                    that.$extra.append(that.enum_extra.ui);
                } else if (this.val() === 'late-flag') {
                    that.$extra.append(that.late_flag_extra.ui);
                }
            }).fire('change');

            this.$add = $('<div class="ui-icon"/>').addClass(Column.ADD).click(function () {
                that.duplicate();
            }).css({cursor: 'pointer'}).attr('title', DetailScreenConfig.message.ADD_COLUMN);
            this.$copy = $('<div class="ui-icon"/>').addClass(Column.COPY).click(function () {
                that.duplicate();
            }).css({cursor: 'pointer'}).attr('title', DetailScreenConfig.message.COPY_COLUMN);
            this.$delete = $('<div class="ui-icon"/>').addClass(Column.DELETE).click(function () {
                $(this).remove();
                that.screen.fire('delete-column', that);
            }).css({cursor: 'pointer'}).attr('title', DetailScreenConfig.message.DELETE_COLUMN);
        }
        Column.GRIP = 'ui-icon-arrowthick-2-n-s';
//        Column.GRIP = 'ui-icon-arrow-4';
        Column.ADD = 'ui-icon-plusthick';
        Column.COPY = 'ui-icon-copy';
        Column.DELETE = 'ui-icon-closethick';

        Column.init = function (col, screen) {
            return new Column(col, screen);
        };
        Column.prototype = {
            duplicate: function () {
                this.screen.fire('add-column', this);
            },
            serialize: function (keepShortLong) {
                var column = this.original;
                column.model = this.model.val();
                column.field = this.field.val();
                column.header[this.lang] = this.header.val();
                column.format = this.format.val();
                column['enum'][this.lang] = unformatEnum(this.enum_extra.val());
                column.late_flag = parseInt(this.late_flag_extra.val(), 10);
                if (!keepShortLong) {
                    delete column.includeInShort;
                    delete column.includeInLong;
                } else {
                    column.includeInShort = this.includeInShort.val();
                    column.includeInLong = this.includeInLong.val();
                }
                return column;
            },
            setGrip: function (grip) {
                if (this.grip !== grip) {
                    this.grip = grip;
                    if (grip) {
                        this.$grip = $('<div class="grip ui-icon"/>').addClass(Column.GRIP).css({
                            cursor: 'move'
                        });
                    } else {
                        this.$grip = $('<span class="sort-disabled"></span>');
                    }
                }
            }
        };
        return Column;
    }());
    Screen = (function () {
        var sectionLabels = {
            'case': "Case Details",
            referral: "Referral Details"
        };
        function Screen($home, spec, options) {
            var i, column, model, property, header,
                that = this, columns;
            eventize(this);
            this.saveUrl = options.saveUrl;
            this.$home = $home;
            this.edit = options.edit;
            this.columns = [];
            this.suggestedColumns = [];
            this.model = spec.short.type === "ref_short" ? "referral" : "case";
            this.lang = options.lang;
            this.properties = options.properties;

            function fireChange() {
                that.fire('change');
            }
            function initColumnAsColumn(column) {
                column.includeInShort.setEdit(that.edit);
                column.includeInLong.setEdit(that.edit);
                column.model.setEdit(false);
                column.field.setEdit(false);
                column.header.setEdit(that.edit);
                column.format.setEdit(that.edit);
                column.enum_extra.setEdit(that.edit);
                column.late_flag_extra.setEdit(that.edit);
                column.setGrip(true);
                column.on('change', fireChange);
                return column;
            }

            function initColumnAsSuggestion(column) {
                column.includeInShort.setEdit(false);
                column.includeInLong.setEdit(false);
                column.model.setEdit(false);
                column.field.setEdit(false);
                column.header.setEdit(false);
                column.format.setEdit(false);
                column.enum_extra.setEdit(false);
                column.late_flag_extra.setEdit(false);
                column.setGrip(false);
                return column;
            }
            
            function toTitleCase(str) {
                return str.replace('_', ' ').replace('-', ' ').replace(/\w\S*/g, function (txt) {
                    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                });
            }
            
            columns = lcsMerge(spec.short.columns, spec.long.columns, _.isEqual).merge;

            // set up the columns
            for (i = 0; i < columns.length; i += 1) {
                column = columns[i].token;
                column.includeInShort = columns[i].x;
                column.includeInLong = columns[i].y;

                this.columns[i] = Column.init(column, this);
                initColumnAsColumn(this.columns[i]);
            }

            // set up the custom column
            this.customColumn = Column.init({model: "case", format: "plain"}, this);
            this.customColumn.field.on('change', function () {
                that.customColumn.header.val(toTitleCase(this.val()));
            }).$edit_view.autocomplete({
                source: function (request, response) {
                    var availableTags = that.properties[that.customColumn.model.val()];
                    response(
                        $.ui.autocomplete.filter(availableTags,  request.term)
                    );
                },
                minLength: 0,
                delay: 0,
                select: function (event, ui) {
                    that.customColumn.field.val(ui.item.value);
                    that.customColumn.field.fire('change');
                }
            }).focus(function () {
                $(this).val("").trigger('change');
                $(this).autocomplete('search');
            });
            
            // set up suggestion columns
            for (model in this.properties) {
                if (this.properties.hasOwnProperty(model) && !(this.model === 'case' && model === 'referral')) {
                    for (i = 0; i < this.properties[model].length; i += 1) {
                        property = this.properties[model][i];
                        header = {};
                        header[this.lang] = toTitleCase(property);
                        column = Column.init({
                            model: model,
                            field: property,
                            header: header
                        }, this);
                        initColumnAsSuggestion(column);
                        this.suggestedColumns.push(column);
                    }
                }
            }
            this.suggestedColumns.sortBy(function () {
                return [this.model.val() === 'referral' ? 1 : 2, this.field.val()];
            });

            this.saveButton = {
                $save: $('<span/>').text(DetailScreenConfig.message.SAVE).click(function () {
                    that.save();
                }).button(),
                $retry: $('<span/>').text(DetailScreenConfig.message.RETRY).click(function () {
                    that.save();
                }).button(),
                $saving: $('<span/>').text(DetailScreenConfig.message.SAVING).button().button('disable'),
                $saved: $('<span/>').text(DetailScreenConfig.message.SAVED).button().button('disable'),
                ui: $('<div/>').css({textAlign: 'right'}),
                setState: function (state) {
                    this.state = state;
                    this.$save.detach();
                    this.$saving.detach();
                    this.$saved.detach();
                    this.$retry.detach();
                    if (state === 'save') {
                        this.ui.append(this.$save);
                    } else if (state === 'saving') {
                        this.ui.append(this.$saving);
                    } else if (state === 'saved') {
                        this.ui.append(this.$saved);
                    } else if (state === 'retry') {
                        this.ui.append(this.$retry);
                    }
                }
            };
            this.saveButton.setState('saved');

            this.render();
//            this.$home.find('*').change(function () {
//                console.log(JSON.stringify(that.serialize()));
//            });
            this.on('add-column', function (column) {
                var i, ii, $tr;
                i = this.columns.indexOf(column);
                if (i === -1) {
                    ii = -1;
                    for (i = 0; i < this.columns.length; i += 1) {
                        if (column.model.val() === this.columns[i].model.val() &&
                                column.field.val() === this.columns[i].field.val()) {
                            ii = i;
                        }
                    }
                    i = ii;
                }
                column = column.serialize(true);
                column = Column.init(column, this);
                initColumnAsColumn(column);
                if (i !== -1) {
                    this.columns.splice(i + 1, 0, column);
                } else {
                    this.columns.push(column);
                }
                $tr = this.addColumn(column, this.$columns, this.$columns.length, false);
                if (i !== -1) {
                    $tr.detach().insertAfter(this.$columns.find('tr:nth-child(' + (i + 1).toString() + ')'));
                }
                $tr.hide().fadeIn('slow');
                this.fire('change');
            });
            this.on('delete-column', function (column) {
                var i = this.columns.indexOf(column);
                this.$columns.find('tr:nth-child(' + (i + 1).toString() + ')').fadeOut('slow', function () {
                    $(this).remove();
                });
                this.columns.splice(i, 1);
                this.fire('change');
            });
            this.on('change', function () {
                this.saveButton.setState('save');
                this.$columns.find('tr').each(function (i) {
                    $(this).data('index', i);
                });
            });
        }
        Screen.init = function ($home, spec, lang) {
            return new Screen($home, spec, lang);
        };
        Screen.prototype = {
            save: function () {
                var that = this;
                $.ajax({
                    url: this.saveUrl,
                    type: "POST",
                    data: {screens: JSON.stringify(this.serialize())},
                    dataType: 'json',
                    beforeSend: function () {
                        that.saveButton.setState('saving');
                    },
                    success: function (data) {
                        COMMCAREHQ.updateDOM(data.update);
                        that.saveButton.setState('saved');
                    },
                    error: function (data) {
                        that.saveButton.setState('retry');
                        alert(DetailScreenConfig.message.ERROR_SAVING);
                    }
                });
            },
            serialize: function () {
                var i, column,
                    shortColumns = [],
                    longColumns = [];
                for (i = 0; i < this.columns.length; i += 1) {
                    column = this.columns[i];
                    if (column.includeInShort.val()) {
                        shortColumns.push(column.serialize());
                    }
                    if (column.includeInLong.val()) {
                        longColumns.push(column.serialize());
                    }
                }

                if (this.model === 'case') {
                    return {
                        'case_short': shortColumns,
                        'case_long': longColumns
                    };
                } else {
                    return {
                        'ref_short': shortColumns,
                        'ref_long': longColumns
                    };
                }
            },
            addColumn: function (column, $tbody, i, suggested) {
                var $tr = $('<tr/>').data('index', i).appendTo($tbody);
                if (suggested && i !== -1) {
                    $tr.addClass('detail-screen-suggestion').attr('title', DetailScreenConfig.message.ADD_COLUMN);
                }
                if (this.edit) {
                    $('<td/>').addClass('detail-screen-icon').append(column.$grip).appendTo($tr);
                } else {
                    $('<td/>').addClass('detail-screen-icon').appendTo($tr);
                }
                
                $('<td/>').addClass('detail-screen-checkbox').append(column.includeInShort.ui).appendTo($tr);
                $('<td/>').addClass('detail-screen-checkbox').append(column.includeInLong.ui).appendTo($tr);

                if (this.model === 'referral') {
                    $('<td/>').addClass('detail-screen-model').append(column.model.ui).appendTo($tr);
                }
                $('<td/>').addClass('detail-screen-field').append(column.field.ui.addClass('code')).appendTo($tr);
                $('<td/>').addClass('detail-screen-header').append(column.header.ui).appendTo($tr);
                $('<td/>').addClass('detail-screen-format').append(column.format.ui).appendTo($tr);
                $('<td/>').addClass('detail-screen-extra').append(column.$extra).appendTo($tr);
                if (this.edit) {
                    $('<td/>').addClass('detail-screen-icon').append(
                        suggested ? "" : column.$delete
                    ).appendTo($tr);
                    $('<td/>').addClass('detail-screen-icon').append(
                        suggested ? column.$add : column.$copy
                    ).appendTo($tr);
                } else {
                    $('<td/>').addClass('detail-screen-icon').appendTo($tr);
                    $('<td/>').addClass('detail-screen-icon').appendTo($tr);

                }
                return $tr;
            },
            render: function () {
                var $table, $columns, $suggestedColumns, $tr, i, $box;
                $('<h1/>').text(sectionLabels[this.model]).appendTo(this.$home);
                $box = $("<div/>").addClass('config').appendTo(this.$home);
                
                // this is a not-so-elegant way to get the styling right
                COMMCAREHQ.initBlock(this.$home);

                function getDuplicateCallback(column) {
                    return function (e) {
                        column.duplicate();
                    };
                }

                if (!this.edit && _.isEmpty(this.columns)) {
                    $('<p/>').text(DetailScreenConfig.message.EMPTY_SCREEN).appendTo($box);
                } else {
                    if (this.edit) {
                        $('<div/>').append(this.saveButton.ui).appendTo($box);
                    }
                    $table = $('<table/>').addClass('detail-screen-table').appendTo($box);

                    $tr = $('<tr/>').appendTo($table);

                    // grip
                    $('<th/>').addClass('detail-screen-icon').appendTo($tr);

                    $('<th/>').addClass('detail-screen-checkbox').text(DetailScreenConfig.message.SHORT).appendTo($tr);
                    $('<th/>').addClass('detail-screen-checkbox').text(DetailScreenConfig.message.LONG).appendTo($tr);
                    if (this.model === "referral") {
                        $('<th/>').addClass('detail-screen-model').text(DetailScreenConfig.message.MODEL).appendTo($tr);
                    }
                    $('<th/>').addClass('detail-screen-field').text(DetailScreenConfig.message.FIELD).appendTo($tr);
                    $('<th/>').addClass('detail-screen-header').text(DetailScreenConfig.message.HEADER).appendTo($tr);
                    $('<th/>').addClass('detail-screen-format').text(DetailScreenConfig.message.FORMAT).appendTo($tr);
                    $('<th/>').addClass('detail-screen-extra').appendTo($tr);

                    $('<th/>').addClass('detail-screen-icon').appendTo($tr);
                    $('<th/>').addClass('detail-screen-icon').appendTo($tr);

                    $columns = $('<tbody/>').addClass('detail-screen-columns').appendTo($table);
                    $suggestedColumns = $('<tbody/>').appendTo($table);

                    for (i = 0; i < this.columns.length; i += 1) {
                        this.addColumn(this.columns[i], $columns, i, false);
                    }

                    if (this.edit) {
                        this.addColumn(this.customColumn, $suggestedColumns, -1, true);

                        for (i = 0; i < this.suggestedColumns.length; i += 1) {
                            this.addColumn(this.suggestedColumns[i], $suggestedColumns, i, true).click(
                                getDuplicateCallback(this.suggestedColumns[i])
                            );
                            this.suggestedColumns[i].includeInShort.ui.hide();
                            this.suggestedColumns[i].includeInLong.ui.hide();
                            this.suggestedColumns[i].$add.hide();
                        }
                    }
                    this.$columns = $columns;

                    // init UI events
                    this.initUI($columns);
                }
            },
            initUI: function (rows) {
                var that = this;
                this.$columns.sortable({
                    handle: '.grip',
                    items: ">*:not(:has(.sort-disabled))",
                    update: function (e, ui) {
                        var fromIndex = ui.item.data('index'),
                            toIndex = rows.find('tr').get().indexOf(ui.item[0]);
                        function reorder(list) {
                            var tmp = list.splice(fromIndex, 1)[0];
                            list.splice(toIndex, 0, tmp);
                        }
                        reorder(that.columns);
                        that.fire('change');
                    }
                });
            }
        };
        return Screen;
    }());
    DetailScreenConfig = (function () {
        var DetailScreenConfig = function ($home, spec) {
            var detail_type,
                that = this;
            this.$home = $home;
            this.properties = spec.properties;
            this.state = {};
            this.lang = spec.lang;
            this.edit = spec.edit;
            this.saveUrl = spec.saveUrl;

            function addScreen(short, long) {
                that.state[detail_type] = Screen.init($('<div/>'), {'short': short, 'long': long}, {
                    lang: that.lang,
                    edit: that.edit,
                    properties: that.properties,
                    saveUrl: that.saveUrl
                });
                that.$home.append(that.state[detail_type].$home);
            }

            addScreen(spec.state.case_short, spec.state.case_long);
            addScreen(spec.state.ref_short, spec.state.ref_long);
        };

        DetailScreenConfig.init = function ($home, spec) {
            return new DetailScreenConfig($home, spec);
        };
        return DetailScreenConfig;
    }());

    DetailScreenConfig.message = {
        EMPTY_SCREEN: 'No detail screen configured',

        SHORT: 'Short',
        LONG: 'Long',

        MODEL: 'Model',
        FIELD: 'Property',
        HEADER: 'Label',
        FORMAT: 'Format',

        PLAIN_FORMAT: 'Plain',
        DATE_FORMAT: 'Date',
        YEARS_AGO_FORMAT: 'Years Ago',
        PHONE_FORMAT: 'Phone Number',
        ENUM_FORMAT: 'ID Mapping',
        ENUM_EXTRA_LABEL: 'Mapping: ',
        LATE_FLAG_FORMAT: 'Late Flag',
        LATE_FLAG_EXTRA_LABEL: 'Days late: ',

        SAVE: 'Save',
        SAVING: 'Saving...',
        SAVED: 'Saved',
        RETRY: 'Try Again',
        ERROR_SAVING: 'There was an error saving',

        ADD_COLUMN: 'Add to list',
        COPY_COLUMN: 'Duplicate',
        DELETE_COLUMN: 'Delete'

    };
    
    return DetailScreenConfig;
}());