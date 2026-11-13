# Global lessons

Lessons true for every topic. The Planner reads this on every run.

* In a patch script that edits several files, run every replace and assertion in memory first and write the files last: a late failure left two files half patched. (confirmed)
* Measure every figure in a summary with a command just before writing it: the Critic failed a file size that was estimated, then went stale after a later fix.
