/* global define */
/**
 *  Handles "Organization Levels" page.
 */
define([
    "locations/ko/location_types",
    "jquery",
    "knockout",
    "style/js/hq.helpers",
], function(
    location_types,
    $,
    ko
) {
    "use strict";

    var initialPageData = $.parseJSON($("#initial-page-json").text()),
        loc_types = initialPageData.loc_types,
        commtrack_enabled = initialPageData.commtrack_enabled;

    var locationSettingsModel = location_types.LocationSettingsViewModel;
    var model = new locationSettingsModel(loc_types, commtrack_enabled);

    var $settings = $('#settings');

    var warnBeforeUnload = function() {
        return gettext("You have unsaved changes.");
    };

    $settings.submit(function() {
        var valid = model.presubmit();
        if (valid) {
            // Don't warn if they're leaving the page due to form submission
            window.onbeforeunload = undefined;
        }
        return valid;
    });

    $settings.koApplyBindings(model);

    $("form#settings").on("change input", function() {
        $(this).find(":submit").addClass("btn-success").enable();
        window.onbeforeunload = warnBeforeUnload;
    });

    $("form#settings button").on("click", function() {
        $("form#settings").find(":submit").addClass("btn-success").enable();
        window.onbeforeunload = warnBeforeUnload;
    });
});
