require('dotenv').config();
const db = require('../utilities/database');

const summaries = [
  [1,  'Introduction to Data Structures and Algorithm Complexity. Topics covered: What are data structures, why they matter, abstract data types, and algorithm analysis using Big-O notation. Big-O examples: O(1) constant, O(log n) logarithmic, O(n) linear, O(n log n) linearithmic, O(n^2) quadratic. Space vs time complexity tradeoffs. Best, average, worst case analysis.'],
  [2,  'Big-O Cheatsheet covering common algorithm complexities. Arrays: access O(1), search O(n), insert O(n). Linked Lists: access O(n), insert O(1). Binary Search Trees: search O(log n) average. Hash Tables: O(1) average for all operations. Sorting: Bubble O(n^2), Merge O(n log n), Quick O(n log n) average.'],
  [3,  'Arrays and Linked Lists. Arrays: contiguous memory, fixed size, O(1) random access, O(n) insert/delete. Singly linked list: nodes with data and next pointer, O(1) insert at head, O(n) search. Doubly linked list: nodes with prev and next pointers. Common operations: traversal, insertion, deletion, reversal.'],
  [4,  'Stacks and Queues. Stack: LIFO (Last In First Out), operations push/pop/peek, applications: function call stack, expression evaluation, undo operations. Queue: FIFO (First In First Out), operations enqueue/dequeue, applications: BFS, task scheduling. Implementations using arrays and linked lists. Circular queue.'],
  [6,  'Divide and Conquer algorithms. Strategy: divide problem into smaller subproblems, solve recursively, combine solutions. Examples: Merge Sort O(n log n), Binary Search O(log n), Quick Sort, Strassen matrix multiplication. Recursion tree analysis. Master Theorem for recurrence relations.'],
  [7,  'Dynamic Programming guide. Optimal substructure and overlapping subproblems. Memoization (top-down) vs tabulation (bottom-up). Classic problems: Fibonacci, 0/1 Knapsack, Longest Common Subsequence, Shortest Path. Time complexity improvements over naive recursion. State definition and transition functions.'],
  [8,  'Relational Database Model. Relations, tuples, attributes. Primary keys, foreign keys, candidate keys. Entity-Relationship diagrams. Relational algebra: select, project, join, union, difference. Normalization: 1NF, 2NF, 3NF, BCNF. Functional dependencies.'],
  [9,  'SQL Cheatsheet. DDL: CREATE TABLE, ALTER TABLE, DROP TABLE. DML: SELECT, INSERT, UPDATE, DELETE. Clauses: WHERE, GROUP BY, HAVING, ORDER BY, LIMIT. Joins: INNER JOIN, LEFT JOIN, RIGHT JOIN, FULL OUTER JOIN. Aggregate functions: COUNT, SUM, AVG, MIN, MAX. Subqueries and views.'],
  [10, 'OSI Model and network layers. Layer 7 Application: HTTP, FTP, SMTP. Layer 6 Presentation: encryption, compression. Layer 5 Session: connection management. Layer 4 Transport: TCP vs UDP, ports, segmentation. Layer 3 Network: IP addressing, routing. Layer 2 Data Link: MAC addresses, frames. Layer 1 Physical: cables, signals.'],
  [11, 'Python Basics Reference. Variables and data types: int, float, str, bool, list, dict, tuple, set. Control flow: if/elif/else, for loops, while loops. Functions: def, parameters, return values, default args, *args, **kwargs. Built-in functions: print, len, range, type, input. String formatting and list comprehensions.'],
];

async function run() {
  for (const [id, text] of summaries) {
    await db.query('UPDATE Material SET Summarize = $1 WHERE material_id = $2', [text, id]);
    console.log(`Updated material_id=${id}`);
  }
  console.log(`\nDone! Updated ${summaries.length} materials with summarize text.`);
  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
