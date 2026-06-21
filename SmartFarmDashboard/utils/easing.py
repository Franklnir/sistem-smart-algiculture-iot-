"""
Easing & interpolation helpers.
"""

import math


def lerp(a: float, b: float, t: float) -> float:
    """Linear interpolation between *a* and *b* by factor *t* ∈ [0, 1]."""
    return a + (b - a) * t


def lerp_color(c1: tuple, c2: tuple, t: float) -> tuple:
    """Lerp each channel of two RGB or RGBA tuples."""
    return tuple(int(lerp(a, b, t)) for a, b in zip(c1, c2))


def ease_in_out_sine(t: float) -> float:
    """Smooth sine ease-in-out, *t* ∈ [0, 1]."""
    return -(math.cos(math.pi * t) - 1.0) / 2.0


def ease_out_quad(t: float) -> float:
    """Quadratic ease-out, *t* ∈ [0, 1]."""
    return 1.0 - (1.0 - t) ** 2


def ease_out_cubic(t: float) -> float:
    """Cubic ease-out, *t* ∈ [0, 1]."""
    return 1.0 - (1.0 - t) ** 3


def ease_in_quad(t: float) -> float:
    """Quadratic ease-in."""
    return t * t


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def remap(value: float, in_lo: float, in_hi: float,
          out_lo: float, out_hi: float) -> float:
    """Map *value* from [in_lo, in_hi] → [out_lo, out_hi]."""
    t = (value - in_lo) / (in_hi - in_lo) if in_hi != in_lo else 0.0
    return lerp(out_lo, out_hi, clamp(t, 0.0, 1.0))
