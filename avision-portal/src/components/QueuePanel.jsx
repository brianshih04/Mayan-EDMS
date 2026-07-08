import { LayoutDashboard } from 'lucide-react';
import { fillTemplate } from '../lib/utils.js';

function QueuePanel({ tasks, onNav, t }) {
  if (!tasks.length) return null;
  return (
    <section className="queue-panel">
      <div className="panel-heading">
        <LayoutDashboard size={20} aria-hidden="true" />
        <h2>{t('queue')}</h2>
      </div>
      <p className="queue-helper">{t('nextAction')}</p>
      <div className="task-list">
        {tasks.map((task) => (
          <button
            className="task-row"
            key={`${task.action}-${task.labelKey}`}
            onClick={() => onNav(task.action)}
            type="button"
          >
            <div className="task-main">
              <strong>{fillTemplate(t(task.labelKey), { count: task.count })}</strong>
            </div>
            <div className={`status ${task.status}`}>{t(task.status)}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default QueuePanel;
