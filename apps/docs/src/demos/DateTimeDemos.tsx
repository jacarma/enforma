// apps/docs/src/demos/DateTimeDemos.tsx
import Enforma from 'enforma';
import { Preview } from '../components/Preview';

export function BasicDemo() {
  return (
    <Preview>
      <Enforma.DatePicker bind="birthday" label="Birthday" />
      <Enforma.TimePicker bind="meetingTime" label="Meeting time" ampm={false} />
      <Enforma.DateTimePicker bind="deadline" label="Deadline" />
    </Preview>
  );
}

export function PastOnlyDemo() {
  return (
    <Preview>
      <Enforma.DatePicker bind="birthday" label="Birthday" disableFuture />
    </Preview>
  );
}

export function TwentyFourHourDemo() {
  return (
    <Preview>
      <Enforma.TimePicker bind="startTime" label="Start time" ampm={false} />
    </Preview>
  );
}
