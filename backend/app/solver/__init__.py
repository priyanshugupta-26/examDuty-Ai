from .cp_solver import (
    FacultyInput,
    SlotInput,
    UnavailabilityInput,
    SolverSettings,
    SolverResult,
    SlotAssignment,
    run_cp_sat_solver,
    calculate_fairness_score,
    compute_allocation_fairness,
)
from .reallocate import reallocate_minimal, ChangeDiff, ReallocateResult

