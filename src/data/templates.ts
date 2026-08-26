import { ReflectionPromptTemplate } from '../types';

export const REFLECTION_TEMPLATES: ReflectionPromptTemplate[] = [
  {
    id: 'evening-unwind',
    category: 'Daily Reflection',
    title: 'Daily Evening Unwind',
    description: 'Decompress after a full day, identify what gave you energy, and let go of tension.',
    initialPrompt: "I'd like to unpack my day. What drained my energy, what brought a moment of ease, and what can I leave behind before sleeping?",
    iconName: 'Moon',
  },
  {
    id: 'anxiety-anchor',
    category: 'Cognitive Reframe',
    title: 'Untangling Anxiety & Overwhelm',
    description: 'Ground runaway thoughts and separate what is within your control from what is not.',
    initialPrompt: "I'm noticing a wave of anxiety or overwhelm right now. Help me separate the noise from what is actually within my immediate influence.",
    iconName: 'Wind',
  },
  {
    id: 'gratitude-micro',
    category: 'Gratitude & Calm',
    title: 'Micro-Moments of Gratitude',
    description: 'Reconnect with simple, overlooked anchors of appreciation and sensory presence.',
    initialPrompt: 'I want to focus on gratitude today. What were 3 small, ordinary things that quietly supported me today?',
    iconName: 'Sparkles',
  },
  {
    id: 'decision-clarity',
    category: 'Goal Alignment',
    title: 'Decision & Values Alignment',
    description: 'Weigh choices through the lens of your core personal values rather than fear.',
    initialPrompt: "I'm facing a difficult decision or hesitation. Help me test my choices against my deepest values and long-term peace.",
    iconName: 'Compass',
  },
  {
    id: 'inner-critic',
    category: 'Cognitive Reframe',
    title: 'Challenging the Inner Critic',
    description: 'Transform self-judgment into compassionate, realistic self-dialogue.',
    initialPrompt: "I caught myself being harsh on myself today. Let's examine this self-critical thought with gentleness and curiosity.",
    iconName: 'ShieldCheck',
  },
];
