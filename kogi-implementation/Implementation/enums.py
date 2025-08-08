from enum import Enum

class ElementStatus(Enum):
    UNKNOWN = "unknown"        # (?, ?) - initial state
    TRUE_FALSE = "true_false"  # (⊤, ⊥) - satisfied/achieved but not executed pending
    TRUE_TRUE = "true_true"    # (⊤, ⊤) - satisfied/achieved and executed pending

class QualityStatus(Enum):
    UNKNOWN = "unknown"
    FULFILLED = "fulfilled"    # ⊤
    DENIED = "denied"         # ⊥

class LinkType(Enum):
    AND = "AND"
    OR = "OR"
    MAKE = "MAKE"
    BREAK = "BREAK"

class LinkStatus(Enum):
    UNKNOWN = "unknown"
    ACTIVATED = "activated"
    DEACTIVATED = "deactivated"
    PARTIALLY_ACTIVATED = "partially activated"