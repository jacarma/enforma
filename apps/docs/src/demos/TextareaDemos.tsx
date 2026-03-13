// apps/docs/src/demos/TextareaDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.Textarea bind="bio" label="Bio" placeholder="Tell us about yourself..." />
    </Preview>
  );
}

export function ValidationDemo() {
  return (
    <Preview>
      <Enforma.Checkbox bind="hasComment" label="Add a comment" />
      <Enforma.Textarea
        bind="comment"
        label="Comment"
        placeholder="Your comment..."
        disabled={({ hasComment }) => !hasComment}
        validate={(v, { hasComment }) => (hasComment && !v ? 'Comment is required' : null)}
      />
    </Preview>
  );
}

export function ConditionalDemo() {
  return (
    <Preview>
      <Enforma.Select bind="feedbackType" label="Feedback type">
        <Enforma.Select.Option value="general" label="General" />
        <Enforma.Select.Option value="bug" label="Bug report" />
      </Enforma.Select>
      <Enforma.Textarea
        bind="bugDetails"
        label="Bug details"
        placeholder="Describe the bug..."
        hidden={({ feedbackType }) => feedbackType !== 'bug'}
        required={({ feedbackType }) => feedbackType === 'bug'}
      />
    </Preview>
  );
}
