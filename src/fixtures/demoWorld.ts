// "Sample University": a fictional demo world (PRD section 6, prompt 1).
// All course codes and content are made up. Deadlines are computed from `now`
// so they are never stale: call getDemoWorld(new Date()).
import { WorldSchema } from '../lib/schemas';
import type { World, Course, Topic, GraphNode, GraphEdge, Deadline } from '../types';

const CS = 'Computer Science';
const MATH = 'Mathematics';
const BIO = 'Biology';

// ---------------------------------------------------------------------------
// Courses (7). Bioinformatics is the bridge course: its concepts live in two domains.
// ---------------------------------------------------------------------------
const courses: Course[] = [
  { id: 'csci101', code: 'CSCI 101', title: 'Introduction to Programming', domain: CS, year: 1, term: 'Fall 2024' },
  { id: 'math110', code: 'MATH 110', title: 'Calculus I', domain: MATH, year: 1, term: 'Fall 2024' },
  { id: 'biol101', code: 'BIOL 101', title: 'Cells and Genetics', domain: BIO, year: 1, term: 'Winter 2025' },
  { id: 'csci201', code: 'CSCI 201', title: 'Data Structures and Algorithms', domain: CS, year: 2, term: 'Fall 2026' },
  { id: 'math210', code: 'MATH 210', title: 'Linear Algebra and Probability', domain: MATH, year: 2, term: 'Fall 2026' },
  { id: 'csci301', code: 'CSCI 301', title: 'Machine Learning', domain: CS, year: 3, term: 'Fall 2026' },
  { id: 'binf301', code: 'BINF 301', title: 'Bioinformatics', domain: BIO, year: 3, term: 'Fall 2026' },
];

// Three topics per course.
const topicNames: Record<string, [string, string, string]> = {
  csci101: ['Programming basics', 'Control flow', 'Functions and data'],
  math110: ['Limits and derivatives', 'Integrals', 'Series'],
  biol101: ['Cells', 'Molecular biology', 'Inheritance and change'],
  csci201: ['Data structures', 'Algorithms', 'Analysis'],
  math210: ['Vectors and matrices', 'Decompositions and gradients', 'Probability'],
  csci301: ['Foundations', 'Models', 'Evaluation'],
  binf301: ['Sequences', 'Genomes and trees', 'Statistics and prediction'],
};
const topics: Topic[] = courses.flatMap((c) =>
  topicNames[c.id].map((name, i) => ({ id: `${c.id}-t${i}`, name, courseId: c.id })),
);

// ---------------------------------------------------------------------------
// Concept nodes (70): [key, label, topic index, one-line summary, optional domains]
// ---------------------------------------------------------------------------
type ConceptRow = [string, string, 0 | 1 | 2, string, string[]?];

const conceptRows: Record<string, ConceptRow[]> = {
  csci101: [
    ['variables', 'Variables and types', 0, 'Named values that store numbers, text, and true/false data.'],
    ['expressions', 'Expressions and operators', 0, 'Combining values with arithmetic, comparison, and logic operators.'],
    ['strings', 'Strings', 0, 'Sequences of characters and the common operations on them.'],
    ['conditionals', 'Conditionals', 1, 'Choosing which code runs using if, else, and boolean tests.'],
    ['loops', 'Loops', 1, 'Repeating steps with for and while loops.'],
    ['debugging', 'Debugging', 1, 'Finding and fixing mistakes with print statements and a debugger.'],
    ['functions', 'Functions', 2, 'Reusable named blocks of code with parameters and return values.'],
    ['recursion', 'Recursion', 2, 'A function that solves a problem by calling itself on a smaller one.'],
    ['lists', 'Lists and arrays', 2, 'Ordered collections you can index, loop over, and change.'],
    ['dicts', 'Dictionaries', 2, 'Collections that map keys to values for fast lookup.'],
  ],
  math110: [
    ['limits', 'Limits', 0, 'The value a function approaches as its input approaches a point.'],
    ['continuity', 'Continuity', 0, 'A function with no jumps or breaks at a point.'],
    ['derivatives', 'Derivatives', 0, 'The instantaneous rate of change of a function.'],
    ['chainrule', 'Chain rule', 0, 'How to differentiate a function inside another function.'],
    ['optimization', 'Optimization', 0, 'Using derivatives to find maximum and minimum values.'],
    ['integrals', 'Integrals', 1, 'Accumulated area under a curve.'],
    ['ftc', 'Fundamental theorem of calculus', 1, 'Links derivatives and integrals as inverse operations.'],
    ['series', 'Sequences and series', 2, 'Infinite sums and when they converge.'],
    ['taylor', 'Taylor series', 2, 'Approximating a function with a polynomial built from its derivatives.'],
  ],
  biol101: [
    ['cell', 'Cell structure', 0, 'Organelles of the cell and what each one does.'],
    ['membrane', 'Membranes and transport', 0, 'How substances cross the cell membrane.'],
    ['dna', 'DNA structure', 1, 'The double helix and the base pairs A-T and C-G.'],
    ['replication', 'DNA replication', 1, 'How a cell copies its DNA before dividing.'],
    ['transcription', 'Transcription', 1, 'Copying a gene from DNA into messenger RNA.'],
    ['geneticcode', 'The genetic code', 1, 'How three-letter codons map to amino acids.'],
    ['translation', 'Translation', 1, 'Building a protein from mRNA at the ribosome.'],
    ['generegulation', 'Gene regulation', 1, 'How cells switch genes on and off.'],
    ['mendel', 'Mendelian inheritance', 2, 'How dominant and recessive traits pass between generations.'],
    ['mutations', 'Mutations', 2, 'Changes in DNA sequence and their effects.'],
  ],
  csci201: [
    ['bigo', 'Big-O analysis', 2, 'Describing how running time grows with input size.'],
    ['linkedlists', 'Linked lists', 0, 'Nodes that each point to the next one.'],
    ['stacksqueues', 'Stacks and queues', 0, 'Last-in-first-out and first-in-first-out collections.'],
    ['trees', 'Trees', 0, 'Hierarchical structures of nodes, including binary search trees.'],
    ['heaps', 'Heaps and priority queues', 0, 'Trees that always give the smallest or largest item first.'],
    ['hashtables', 'Hash tables', 0, 'Constant-time lookup by turning keys into array positions.'],
    ['graphs', 'Graphs and traversal', 0, 'Nodes joined by edges, explored with breadth-first and depth-first search.'],
    ['sorting', 'Sorting algorithms', 1, 'Merge sort, quicksort, and how they compare.'],
    ['binarysearch', 'Binary search', 1, 'Finding an item in sorted data by halving the range.'],
    ['shortestpaths', 'Shortest paths', 1, "Dijkstra's algorithm for the cheapest route through a weighted graph."],
    ['dp', 'Dynamic programming', 1, 'Solving big problems by storing answers to overlapping subproblems.'],
  ],
  math210: [
    ['vectors', 'Vectors', 0, 'Quantities with direction and size, and the dot product.'],
    ['matrices', 'Matrix operations', 0, 'Adding, multiplying, and transposing matrices.'],
    ['linsys', 'Linear systems', 0, 'Solving many linear equations at once with matrices.'],
    ['eigen', 'Eigenvalues and eigenvectors', 1, 'Directions a matrix only stretches, and by how much.'],
    ['svd', 'Singular value decomposition', 1, 'Factoring any matrix into rotations and scalings.'],
    ['partials', 'Partial derivatives and gradients', 1, 'Derivatives of functions of many variables, collected as a gradient vector.'],
    ['prob', 'Probability basics', 2, 'Sample spaces, events, and the rules of probability.'],
    ['bayes', "Conditional probability and Bayes' rule", 2, 'Updating a probability after seeing new evidence.'],
    ['distributions', 'Random variables and distributions', 2, 'Discrete and continuous distributions such as binomial and normal.'],
    ['expectation', 'Expectation and variance', 2, 'The average value of a random variable and how spread out it is.'],
    ['mle', 'Maximum likelihood estimation', 2, 'Choosing parameters that make the observed data most probable.'],
  ],
  csci301: [
    ['supervised', 'Supervised learning', 0, 'Learning a mapping from labelled examples.'],
    ['gradientdescent', 'Gradient descent', 0, 'Minimizing a loss by repeatedly stepping against the gradient.', [CS, MATH]],
    ['linreg', 'Linear regression', 1, 'Fitting a straight line or plane to predict a number.'],
    ['logreg', 'Logistic regression', 1, 'Predicting the probability of a class with a sigmoid.'],
    ['decisiontrees', 'Decision trees', 1, 'Predicting by asking a sequence of yes/no questions about the data.'],
    ['perceptron', 'Perceptron', 1, 'A single artificial neuron with a weighted sum and a threshold.'],
    ['backprop', 'Backpropagation', 1, 'Computing gradients through a network layer by layer with the chain rule.'],
    ['nn', 'Neural networks', 1, 'Layers of neurons trained end to end to learn complex functions.'],
    ['cnn', 'Convolutional networks', 1, 'Networks that scan an input with small learned filters, used for images.'],
    ['overfitting', 'Overfitting and regularization', 2, 'When a model memorizes training data, and ways to prevent it.'],
    ['crossval', 'Cross-validation', 2, 'Estimating how a model generalizes by rotating held-out data.'],
  ],
  binf301: [
    ['seqalign', 'Sequence alignment', 0, 'Lining up DNA or protein sequences to measure similarity.', [BIO, CS]],
    ['blast', 'BLAST heuristic search', 0, 'Fast approximate search of a sequence against a large database.', [BIO, CS]],
    ['assembly', 'Genome assembly', 1, 'Piecing short reads back into a whole genome using graphs.', [BIO, CS]],
    ['phylo', 'Phylogenetic trees', 1, 'Trees that show how species or sequences are related by descent.', [BIO, CS]],
    ['motifs', 'Motif finding', 2, 'Statistical detection of short repeated patterns such as binding sites.', [BIO, MATH]],
    ['expression', 'Gene expression analysis', 2, 'Comparing how active genes are across samples.', [BIO, MATH]],
    ['variants', 'Variant calling', 2, 'Deciding from noisy reads whether a genome differs from a reference.', [BIO, MATH]],
    ['proteinpred', 'Protein structure prediction', 2, 'Predicting a protein shape from its amino acid sequence.', [BIO, CS]],
  ],
};

// ---------------------------------------------------------------------------
// Assignment / exam nodes (8): [key, label, type, course, topic index, summary]
// ---------------------------------------------------------------------------
const taskRows: [string, string, 'assignment' | 'exam', string, string][] = [
  ['cs201_a2', 'CSCI 201 Assignment 2: Graph search', 'assignment', 'csci201', 'Implement breadth-first search and Dijkstra on a campus map.'],
  ['cs201_final', 'CSCI 201 Final exam', 'exam', 'csci201', 'Cumulative exam on data structures and algorithm analysis.'],
  ['m210_midterm', 'MATH 210 Midterm', 'exam', 'math210', 'Matrices, linear systems, and eigenvalues.'],
  ['m210_a3', 'MATH 210 Assignment 3: Bayes problems', 'assignment', 'math210', 'Problem set on conditional probability and distributions.'],
  ['cs301_proj', 'CSCI 301 Project: Image classifier', 'assignment', 'csci301', 'Train and evaluate a small convolutional network.'],
  ['cs301_final', 'CSCI 301 Final exam', 'exam', 'csci301', 'Cumulative exam on models and training.'],
  ['binf_a1', 'BINF 301 Assignment 1: Align two genomes', 'assignment', 'binf301', 'Write a dynamic-programming aligner for two short genomes.'],
  ['binf_final', 'BINF 301 Final exam', 'exam', 'binf301', 'Cumulative exam on sequence analysis and genomics.'],
];

function buildNodes(): GraphNode[] {
  const nodes: GraphNode[] = [];
  for (const course of courses) {
    for (const [key, label, topicIdx, summary, domains] of conceptRows[course.id]) {
      nodes.push({
        id: key,
        label,
        type: 'concept',
        courseIds: [course.id],
        domains: domains ?? [course.domain],
        years: [course.year],
        topicId: `${course.id}-t${topicIdx}`,
        summary,
        mastery: null,
      });
    }
  }
  for (const [key, label, type, courseId, summary] of taskRows) {
    const course = courses.find((c) => c.id === courseId)!;
    nodes.push({
      id: key,
      label,
      type,
      courseIds: [courseId],
      domains: [course.domain],
      years: [course.year],
      topicId: null,
      summary,
      mastery: null,
    });
  }
  return nodes;
}

// ---------------------------------------------------------------------------
// Edges. P = accepted prerequisite ("from is needed for to"), R = related, S = suggested.
// ---------------------------------------------------------------------------
const edges: GraphEdge[] = [];
function add(
  from: string,
  to: string,
  type: GraphEdge['type'],
  label: string | null,
  status: GraphEdge['status'],
  confidence: number,
) {
  edges.push({ id: `${from}__${to}`, from, to, type, label, status, confidence });
}
const P = (from: string, to: string, label: string | null = null) => add(from, to, 'prerequisite', label, 'accepted', 1);
const R = (from: string, to: string, label: string | null = null) => add(from, to, 'related', label, 'accepted', 1);
const S = (from: string, to: string, type: GraphEdge['type'], label: string, confidence: number) =>
  add(from, to, type, label, 'suggested', confidence);

// CSCI 101
P('variables', 'expressions');
P('variables', 'strings');
P('expressions', 'conditionals');
P('conditionals', 'loops');
P('loops', 'lists');
P('lists', 'dicts');
P('loops', 'functions');
P('functions', 'recursion');
R('strings', 'lists', 'both are sequences');
R('debugging', 'functions', 'tracing calls');
// MATH 110
P('limits', 'continuity');
P('limits', 'derivatives');
P('continuity', 'derivatives');
P('derivatives', 'chainrule');
P('derivatives', 'optimization');
P('derivatives', 'ftc');
P('integrals', 'ftc');
P('limits', 'series');
P('series', 'taylor');
P('derivatives', 'taylor');
// BIOL 101
P('cell', 'membrane');
P('dna', 'replication');
P('dna', 'transcription');
P('dna', 'geneticcode');
P('transcription', 'translation');
P('geneticcode', 'translation');
P('transcription', 'generegulation');
P('replication', 'mutations');
R('mendel', 'mutations', 'inherited changes');
// CSCI 201 (and links back to Year 1)
P('lists', 'linkedlists', 'pointers replace indexes');
P('dicts', 'hashtables', 'how dictionaries work inside');
P('recursion', 'trees', 'trees are recursive');
P('loops', 'bigo', 'counting loop steps');
P('linkedlists', 'stacksqueues');
P('linkedlists', 'trees');
P('trees', 'heaps');
P('trees', 'graphs');
P('stacksqueues', 'graphs', 'DFS and BFS');
P('graphs', 'shortestpaths');
P('heaps', 'shortestpaths', 'priority queue');
P('bigo', 'sorting');
P('recursion', 'sorting', 'merge sort');
P('sorting', 'binarysearch');
P('recursion', 'dp');
// MATH 210 (and links back to MATH 110)
P('vectors', 'matrices');
P('matrices', 'linsys');
P('linsys', 'eigen');
P('eigen', 'svd');
P('derivatives', 'partials', 'one variable to many');
P('vectors', 'partials', 'the gradient is a vector');
P('prob', 'bayes');
P('prob', 'distributions');
P('integrals', 'distributions', 'continuous distributions');
P('distributions', 'expectation');
P('expectation', 'mle');
P('distributions', 'mle');
// CSCI 301: the chain from Neural networks back to Year 1 math
P('supervised', 'linreg');
P('supervised', 'decisiontrees');
P('derivatives', 'gradientdescent', 'slope points downhill');
P('partials', 'gradientdescent', 'gradient of many weights');
P('gradientdescent', 'linreg', 'how it is trained');
P('linreg', 'logreg');
P('gradientdescent', 'logreg');
P('mle', 'logreg', 'fit by maximum likelihood');
P('logreg', 'perceptron');
P('perceptron', 'nn');
P('chainrule', 'backprop', 'chain rule through layers');
P('gradientdescent', 'backprop');
P('backprop', 'nn', 'how nets are trained');
P('matrices', 'nn', 'layers are matrix products');
P('nn', 'cnn');
P('linreg', 'overfitting');
P('overfitting', 'crossval');
R('overfitting', 'nn', 'big networks overfit');
R('expectation', 'overfitting', 'bias and variance');
// BINF 301 (bridge course: Biology with Computer Science and Mathematics)
P('dp', 'seqalign', 'alignment is dynamic programming');
P('dna', 'seqalign');
P('seqalign', 'blast');
P('graphs', 'assembly', 'reads form a graph');
P('dna', 'assembly');
P('trees', 'phylo');
P('seqalign', 'phylo');
P('mutations', 'phylo', 'mutations measure distance');
P('prob', 'motifs');
P('mle', 'motifs');
P('distributions', 'expression');
P('generegulation', 'expression');
P('bayes', 'variants');
P('mutations', 'variants');
P('seqalign', 'variants', 'compare to a reference');
P('nn', 'proteinpred');
P('translation', 'proteinpred');
// Assignments and exams: concept -> task ("needed for")
P('graphs', 'cs201_a2', 'needed for');
P('shortestpaths', 'cs201_a2', 'needed for');
P('sorting', 'cs201_final', 'needed for');
P('trees', 'cs201_final', 'needed for');
P('dp', 'cs201_final', 'needed for');
P('linsys', 'm210_midterm', 'needed for');
P('eigen', 'm210_midterm', 'needed for');
P('bayes', 'm210_a3', 'needed for');
P('distributions', 'm210_a3', 'needed for');
P('cnn', 'cs301_proj', 'needed for');
P('overfitting', 'cs301_proj', 'needed for');
P('crossval', 'cs301_proj', 'needed for');
P('nn', 'cs301_final', 'needed for');
P('backprop', 'cs301_final', 'needed for');
P('seqalign', 'binf_a1', 'needed for');
P('dp', 'binf_a1', 'needed for');
P('blast', 'binf_final', 'needed for');
P('assembly', 'binf_final', 'needed for');
// AI-suggested links (dashed until a student accepts them)
S('hashtables', 'blast', 'applies', 'k-mer index', 0.78);
S('svd', 'expression', 'applies', 'PCA on expression data', 0.66);
S('mle', 'variants', 'applies', 'likelihood of a variant', 0.62);
S('shortestpaths', 'assembly', 'related', 'path finding in assembly graphs', 0.55);
S('decisiontrees', 'variants', 'applies', 'filtering variant calls', 0.5);
S('mendel', 'bayes', 'related', 'inheritance probabilities', 0.58);
S('recursion', 'phylo', 'applies', 'recursive tree building', 0.6);
S('crossval', 'proteinpred', 'applies', 'validating predictors', 0.7);
S('eigen', 'gradientdescent', 'related', 'conditioning of the loss surface', 0.45);
S('cnn', 'motifs', 'applies', 'filters as motif detectors', 0.68);

// ---------------------------------------------------------------------------
// Deadlines (12), dated relative to `now`
// ---------------------------------------------------------------------------
type DeadlineRow = {
  key: string; courseId: string; title: string; kind: Deadline['kind'];
  inDays: number | null; hour?: number; dueText?: string; weightPct: number | null; nodeIds: string[];
};
const deadlineRows: DeadlineRow[] = [
  { key: 'cs201-a2', courseId: 'csci201', title: 'Assignment 2: Graph search', kind: 'assignment', inDays: 3, weightPct: 10, nodeIds: ['cs201_a2', 'graphs', 'shortestpaths'] },
  { key: 'm210-quiz2', courseId: 'math210', title: 'Quiz 2: Eigenvalues', kind: 'quiz', inDays: 5, hour: 10, weightPct: 5, nodeIds: ['eigen', 'linsys'] },
  { key: 'binf-a1', courseId: 'binf301', title: 'Assignment 1: Align two genomes', kind: 'assignment', inDays: 6, weightPct: 12, nodeIds: ['binf_a1', 'seqalign', 'dp'] },
  { key: 'm210-a3', courseId: 'math210', title: 'Assignment 3: Bayes problems', kind: 'assignment', inDays: 10, weightPct: 8, nodeIds: ['m210_a3', 'bayes', 'distributions'] },
  { key: 'cs301-midterm', courseId: 'csci301', title: 'Midterm exam', kind: 'midterm', inDays: null, dueText: 'Week 9, date to be announced', weightPct: 25, nodeIds: ['linreg', 'logreg', 'gradientdescent', 'overfitting'] },
  { key: 'm210-midterm', courseId: 'math210', title: 'Midterm', kind: 'midterm', inDays: 14, hour: 18, weightPct: 25, nodeIds: ['m210_midterm', 'matrices', 'linsys', 'eigen'] },
  { key: 'cs201-quiz3', courseId: 'csci201', title: 'Quiz 3: Trees and heaps', kind: 'quiz', inDays: 17, hour: 10, weightPct: 5, nodeIds: ['trees', 'heaps'] },
  { key: 'cs301-proj', courseId: 'csci301', title: 'Project: Image classifier', kind: 'project', inDays: 24, weightPct: 20, nodeIds: ['cs301_proj', 'cnn', 'overfitting', 'crossval'] },
  { key: 'binf-proposal', courseId: 'binf301', title: 'Final project proposal', kind: 'project', inDays: null, dueText: 'Before reading week', weightPct: 5, nodeIds: ['assembly', 'phylo'] },
  { key: 'cs201-final', courseId: 'csci201', title: 'Final exam', kind: 'final', inDays: 40, hour: 14, weightPct: 40, nodeIds: ['cs201_final', 'sorting', 'trees', 'dp'] },
  { key: 'cs301-final', courseId: 'csci301', title: 'Final exam', kind: 'final', inDays: 44, hour: 9, weightPct: 35, nodeIds: ['cs301_final', 'nn', 'backprop'] },
  { key: 'binf-final', courseId: 'binf301', title: 'Final exam', kind: 'final', inDays: 47, hour: 14, weightPct: 40, nodeIds: ['binf_final', 'blast', 'assembly'] },
];

function buildDeadlines(now: Date): Deadline[] {
  return deadlineRows.map((r) => {
    if (r.inDays === null) {
      return {
        id: r.key, courseId: r.courseId, title: r.title, kind: r.kind,
        dueAt: null, dueText: r.dueText ?? 'Date not found', weightPct: r.weightPct,
        nodeIds: r.nodeIds, status: 'needs_review' as const,
      };
    }
    const due = new Date(now);
    due.setDate(due.getDate() + r.inDays);
    due.setHours(r.hour ?? 23, r.hour === undefined ? 59 : 0, 0, 0);
    return {
      id: r.key, courseId: r.courseId, title: r.title, kind: r.kind,
      dueAt: due.toISOString(),
      dueText: due.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      weightPct: r.weightPct, nodeIds: r.nodeIds, status: 'confirmed' as const,
    };
  });
}

/** The fictional Sample University world. Pass `now` so deadlines are never stale. */
export function getDemoWorld(now: Date = new Date()): World {
  return WorldSchema.parse({
    courses,
    topics,
    nodes: buildNodes(),
    edges,
    deadlines: buildDeadlines(now),
  });
}
