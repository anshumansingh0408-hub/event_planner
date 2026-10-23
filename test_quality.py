"""Quality gate tests enforcing code cleanliness, docstrings, typing, and line length rules.

Uses the Python AST to statically inspect source modules.
"""

import ast
import os
import unittest


class TestCodeQuality(unittest.TestCase):
    """Quality gate assertions across the core Utsav codebase."""

    def setUp(self) -> None:
        """Locate target modules for static code quality inspection."""
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.target_files = ["app.py", "planner.py", "ai_client.py", "utils.py"]

    def test_module_docstrings(self) -> None:
        """Verify every core Python module contains a non-empty module docstring."""
        missing = []
        for fname in self.target_files:
            fpath = os.path.join(self.base_dir, fname)
            with open(fpath, "r", encoding="utf-8") as f:
                tree = ast.parse(f.read(), filename=fname)
            doc = ast.get_docstring(tree)
            if not doc or not doc.strip():
                missing.append(fname)
        self.assertEqual(missing, [], f"Missing module docstrings in: {missing}")

    def test_no_hardcoded_aiza_keys(self) -> None:
        """Verify no source file contains a hard-coded API key starting with 'AIza'."""
        violations = []
        for fname in self.target_files:
            fpath = os.path.join(self.base_dir, fname)
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
            if "AIza" in content:
                violations.append(fname)
        self.assertEqual(violations, [], f"Hardcoded AIza key found in: {violations}")

    def test_function_quality_gate(self) -> None:
        """Verify every function has docstring, typed params, returns, and <=30 lines."""
        failures = []
        for fname in self.target_files:
            fpath = os.path.join(self.base_dir, fname)
            with open(fpath, "r", encoding="utf-8") as f:
                tree = ast.parse(f.read(), filename=fname)

            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    fn_name = f"{fname}::{node.name} (line {node.lineno})"

                    # 1. Docstring check
                    doc = ast.get_docstring(node)
                    if not doc or not doc.strip():
                        failures.append(f"{fn_name}: missing docstring")

                    # 2. Parameter annotations
                    all_args = (
                        node.args.args
                        + getattr(node.args, "posonlyargs", [])
                        + node.args.kwonlyargs
                    )
                    for arg in all_args:
                        if arg.arg != "self" and arg.annotation is None:
                            failures.append(
                                f"{fn_name}: parameter '{arg.arg}' missing type annotation"
                            )
                    if node.args.vararg and node.args.vararg.annotation is None:
                        failures.append(
                            f"{fn_name}: *{node.args.vararg.arg} missing type annotation"
                        )
                    if node.args.kwarg and node.args.kwarg.annotation is None:
                        failures.append(
                            f"{fn_name}: **{node.args.kwarg.arg} missing type annotation"
                        )

                    # 3. Return annotation
                    if node.returns is None:
                        failures.append(f"{fn_name}: missing return type annotation")

                    # 4. Body length <= 30 lines
                    length = getattr(node, "end_lineno", node.lineno) - node.lineno + 1
                    if length > 30:
                        failures.append(f"{fn_name}: body length {length} exceeds 30 lines limit")

        self.assertEqual(
            failures,
            [],
            "Quality gate violations detected:\n" + "\n".join(f" - {f}" for f in failures),
        )


if __name__ == "__main__":
    unittest.main()
