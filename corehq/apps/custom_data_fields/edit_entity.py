from collections import OrderedDict
from django.core.urlresolvers import reverse
from django.utils.translation import ugettext as _
from django import forms

from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Fieldset, Div, HTML, Field
from corehq.apps.style.forms.widgets import Select2MultipleChoiceWidget

from dimagi.utils.decorators.memoized import memoized

from .models import (CustomDataFieldsDefinition, is_system_key,
                     CUSTOM_DATA_FIELD_PREFIX)


def add_prefix(field_dict):
    """
    Prefix all keys in the dict with the defined
    custom data prefix (such as data-field-whatevs).
    """
    return {
        "{}-{}".format(CUSTOM_DATA_FIELD_PREFIX, k): v
        for k, v in field_dict.iteritems()
    }


def get_prefixed(field_dict):
    """
    The inverse of add_prefix.
    Returns all prefixed elements of a dict with the prefices stripped.
    """
    prefix_len = len(CUSTOM_DATA_FIELD_PREFIX) + 1
    return {
        k[prefix_len:]: v
        for k, v in field_dict.items()
        if k.startswith(CUSTOM_DATA_FIELD_PREFIX)
    }


def _make_field(field):
    if field.choices:
        if not field.is_multiple_choice:
            choice_field = forms.ChoiceField(
                label=field.label,
                required=field.is_required,
                choices=[('', _('Select one'))] + [(c, c) for c in field.choices],
            )
        else:
            choice_field = forms.MultipleChoiceField(
                label=field.label,
                required=field.is_required,
                choices=[(c, c) for c in field.choices],
                widget=Select2MultipleChoiceWidget
            )
        return choice_field
    return forms.CharField(label=field.label, required=field.is_required)


class CustomDataEditor(object):
    """
    Tool to edit the data for a particular entity, like for an individual user.
    """

    def __init__(self, field_view, domain, existing_custom_data=None,
                 post_dict=None, required_only=False, angular_model=None):
        self.field_view = field_view
        self.domain = domain
        self.existing_custom_data = existing_custom_data
        self.required_only = required_only
        self.angular_model = angular_model
        self.form = self.init_form(post_dict)

    @property
    @memoized
    def model(self):
        definition = CustomDataFieldsDefinition.get_or_create(
            self.domain,
            self.field_view.field_type,
        )
        return definition or CustomDataFieldsDefinition()

    def is_valid(self):
        return self.form.is_valid()

    @property
    def errors(self):
        self.form.is_valid()
        return self.form.errors

    def get_data_to_save(self):
        cleaned_data = self.form.cleaned_data
        system_data = {
            k: v for k, v in self.existing_custom_data.items()
            if is_system_key(k)
        } if self.existing_custom_data else {}
        # reset form to clear uncategorized data
        self.existing_custom_data = None
        self.form = self.init_form(add_prefix(cleaned_data))
        self.form.is_valid()
        return dict(cleaned_data, **system_data)

    @property
    @memoized
    def fields(self):
        return self.model.get_fields(required_only=self.required_only)

    def init_form(self, post_dict=None):
        fields = OrderedDict()
        for field in self.fields:
            fields[field.slug] = _make_field(field)

        if self.angular_model:
            field_names = [

                Field(
                    field_name,
                    ng_model="{}.{}".format(self.angular_model, field_name),
                    ng_required="true" if field.required else "false"
                )
                for field_name, field in fields.items()
            ]
        else:
            field_names = fields.keys()

        CustomDataForm = type('CustomDataForm', (forms.Form,), fields)
        CustomDataForm.helper = FormHelper()
        CustomDataForm.helper.form_tag = False
        CustomDataForm.helper.label_class = 'col-sm-4' if self.angular_model else 'col-sm-3 col-md-2'
        CustomDataForm.helper.field_class = 'col-sm-8' if self.angular_model else 'col-sm-9 col-md-8 col-lg-6'

        additional_fields = []
        if field_names:
            additional_fields.append(Fieldset(_("Additional Information"), *field_names))
        if post_dict is None:
            additional_fields.append(self.uncategorized_form)
        CustomDataForm.helper.layout = Layout(
            *additional_fields
        )

        CustomDataForm._has_uncategorized = bool(self.uncategorized_form) and post_dict is None

        if post_dict:
            fields = post_dict
        elif self.existing_custom_data is not None:
            fields = add_prefix(self.existing_custom_data)
        else:
            fields = None

        self.form = CustomDataForm(fields, prefix=CUSTOM_DATA_FIELD_PREFIX)
        return self.form

    @property
    @memoized
    def uncategorized_form(self):

        def FakeInput(val):
            return HTML(u'<p class="form-control-static">{}</p>'
                        .format(val))

        def Label(val):
            return HTML('<label class="control-label col-sm-3 col-md-2">{}</label>'.format(val))

        def _make_field_div(slug, val):
            return Div(
                Label(slug),
                Div(
                    FakeInput(val),
                    css_class="controls col-sm-9 col-md-8 col-lg-6",
                ),
                css_class="form-group",
            )

        fields = [f.slug for f in self.model.get_fields()]
        help_div = [
            _make_field_div(slug, val)
            for slug, val in self.existing_custom_data.items()
            if (slug not in fields and not is_system_key(slug))
        ] if self.existing_custom_data is not None else []

        msg = """
        <strong>Warning!</strong>
        This data is not part of the specified user fields and will be
        deleted when you re-save this user.
        You can add the fields back <a href="{}">here</a> to prevent this
        deletion.
        """.format(reverse(
            self.field_view.urlname, args=[self.domain]
        ))

        return Fieldset(
            _("Unrecognized Information"),
            Div(
                HTML(msg),
                css_class="alert alert-warning",
                css_id="js-unrecognized-data",
            ),
            *help_div
        ) if len(help_div) else HTML('')
