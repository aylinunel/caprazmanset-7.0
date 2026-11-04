"""BiasGuard: evidence-bound cognitive-bias reasoning review."""
from .engine import BiasGuard
from .catalog import CatalogError, load_cards, load_source_index
from .providers import OpenAIReviewer, ProviderConfigurationError, ProviderCallError

__all__ = [
    "BiasGuard",
    "CatalogError",
    "OpenAIReviewer",
    "ProviderConfigurationError",
    "ProviderCallError",
    "load_cards",
    "load_source_index",
]

__version__ = "0.1.0"
