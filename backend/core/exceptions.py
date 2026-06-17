from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError, ObjectDoesNotExist
from django.db import IntegrityError

def format_detail(detail):
    if isinstance(detail, dict):
        msgs = []
        for key, val in detail.items():
            msgs.append(f"{key}: {format_detail(val)}")
        return "; ".join(msgs)
    elif isinstance(detail, list):
        return ", ".join([format_detail(item) for item in detail])
    return str(detail)

def custom_exception_handler(exc, context):
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    if response is not None:
        # It's a DRF-generated exception
        data = response.data
        if isinstance(data, dict):
            # If standard DRF exception returned 'detail'
            if "detail" in data:
                detail = data.pop("detail")
                data["error"] = format_detail(detail)
            # If standard DRF validation returned validation fields or keys other than 'error'
            elif "error" not in data:
                # Format all validation issues into a single error string
                data["error"] = format_detail(data)
                # Remove other keys to strictly match ErrorResponse schema
                keys_to_remove = [k for k in list(data.keys()) if k != "error"]
                for k in keys_to_remove:
                    data.pop(k)
        elif isinstance(data, list):
            # If the response data is a list of errors
            error_msg = format_detail(data)
            response.data = {"error": error_msg}
        else:
            response.data = {"error": str(data)}
    else:
        # Non-DRF unhandled exception
        if isinstance(exc, DjangoValidationError):
            error_msg = format_detail(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
            response = Response(
                {"error": error_msg},
                status=status.HTTP_400_BAD_REQUEST
            )
        elif isinstance(exc, ObjectDoesNotExist):
            response = Response(
                {"error": str(exc)},
                status=status.HTTP_404_NOT_FOUND
            )
        elif isinstance(exc, ValueError):
            response = Response(
                {"error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )
        elif isinstance(exc, IntegrityError):
            response = Response(
                {"error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )
        else:
            # Fallback for other unexpected exceptions
            response = Response(
                {"error": f"Internal server error: {str(exc)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    return response
