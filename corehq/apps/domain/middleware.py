# Use modern Python
from __future__ import unicode_literals, print_function, absolute_import

# External imports
from django.utils.decorators import method_decorator
from django.views.decorators.debug import sensitive_post_parameters
from corehq.apps.accounting.exceptions import AccountingError
from corehq.apps.accounting.models import Subscription
from django_prbac.models import Role


class CCHQPRBACMiddleware(object):
    """
    MiddleWare to add request.role based on user or domain
    information. This _must_ be placed after the
    UserMiddleWare if you want it to find the domain and user
    on the request object.

    Note that because the domain comes from the view kwargs, these are all
    'process_view' middleware classes.

    Also note that this is, for now, used only for domain/plan privileges
    so request.role is the Role for the domain's plan, not for the user.
    Neither domains nor users currently have roles in the PRBAC tables.
    """

    @method_decorator(sensitive_post_parameters('password'))
    def process_view(self, request, view_func, view_args, view_kwargs):
        self.apply_prbac(request)
        return None

    @classmethod
    def apply_prbac(cls, request):
        if hasattr(request, 'domain'):
            try:
                plan_version, subscription = Subscription.get_subscribed_plan_by_domain(request.domain)
                request.role = plan_version.role
                request.plan = plan_version
                request.subscription = subscription
                return None
            except AccountingError:
                pass
        try:
            request.role = Role.objects.get(slug='community_plan_v0')
        except Role.DoesNotExist:
            request.role = Role()  # A fresh Role() has no privileges
