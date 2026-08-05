import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@renderer/api/client';
import { useToast } from '@renderer/components/Toast';
import { IconCheck } from '@renderer/components/icons';
import { FingerprintEnroll } from '@renderer/components/FingerprintEnroll';

/** Normalize a Kenyan phone number to 254XXXXXXXXX, or return null if invalid. */
function normalizePhone(raw: string): string | null {
  const s = raw.replace(/[\s\-+]/g, '');
  if (/^0[17]\d{8}$/.test(s)) return `254${s.slice(1)}`;
  if (/^254[17]\d{8}$/.test(s)) return s;
  if (/^[17]\d{8}$/.test(s)) return `254${s}`;
  return null;
}

type Step = 1 | 2 | 3;

function Stepper({ step }: { step: Step }): JSX.Element {
  const steps = ['Student details', 'Fingerprint', 'Done'];
  return (
    <div className="stepper">
      {steps.map((name, i) => {
        const n = (i + 1) as Step;
        const state = n < step ? 'done' : n === step ? 'current' : '';
        return (
          <div key={name} style={{ display: 'contents' }}>
            {i > 0 && <div className={`step-line ${n <= step ? 'done' : ''}`} />}
            <div className={`step ${state}`}>
              <div className="step-dot">{n < step ? <IconCheck className="ic" /> : n}</div>
              <div className="step-name">{name}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Onboard({ orgId }: { orgId: string }): JSX.Element {
  const qc = useQueryClient();
  const toast = useToast();

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [admission, setAdmission] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [student, setStudent] = useState<{ id: string; name: string; accountNumber: string } | null>(null);
  const [enrolled, setEnrolled] = useState(false);

  const onboard = useMutation({
    mutationFn: (phone: string) =>
      api.onboardMember(orgId, {
        name: name.trim(),
        externalRef: admission.trim(),
        guardianPhone: phone,
        ...(guardianName.trim() ? { guardianName: guardianName.trim() } : {}),
      }),
    onSuccess: (m) => {
      setStudent({ id: m.id, name: m.name, accountNumber: m.accountNumber });
      void qc.invalidateQueries({ queryKey: ['students', orgId] });
      setStep(2);
    },
    onError: (e) => toast.push('err', e instanceof ApiError ? e.message : 'Onboarding failed'),
  });

  function submitDetails(e: FormEvent): void {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Student name is required.';
    if (!admission.trim()) errors.admission = 'Admission number is required.';
    const phone = normalizePhone(guardianPhone);
    if (!phone) errors.phone = 'Enter a valid Kenyan number, e.g. 0712 345 678.';
    setFieldErrors(errors);
    if (Object.keys(errors).length === 0 && phone) onboard.mutate(phone);
  }

  function reset(): void {
    setStep(1);
    setName('');
    setAdmission('');
    setGuardianPhone('');
    setGuardianName('');
    setFieldErrors({});
    setStudent(null);
    setEnrolled(false);
  }

  return (
    <div className="card">
      <div className="card-body">
        <Stepper step={step} />

        {step === 1 && (
          <form className="form-grid cols" onSubmit={submitDetails} noValidate>
            <div className="field">
              <label htmlFor="ob-name">Student name</label>
              <input
                id="ob-name"
                className={`input ${fieldErrors.name ? 'invalid' : ''}`}
                placeholder="Grace Njeri"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
            </div>
            <div className="field">
              <label htmlFor="ob-adm">Admission number</label>
              <input
                id="ob-adm"
                className={`input ${fieldErrors.admission ? 'invalid' : ''}`}
                placeholder="ADM-2026-001"
                value={admission}
                onChange={(e) => setAdmission(e.target.value)}
              />
              {fieldErrors.admission && <span className="field-error">{fieldErrors.admission}</span>}
            </div>
            <div className="field">
              <label htmlFor="ob-gphone">Parent / guardian phone</label>
              <input
                id="ob-gphone"
                className={`input ${fieldErrors.phone ? 'invalid' : ''}`}
                placeholder="0712 345 678"
                inputMode="tel"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
              />
              {fieldErrors.phone ? (
                <span className="field-error">{fieldErrors.phone}</span>
              ) : (
                <span className="field-hint">The guardian tops up and gets receipts on this number.</span>
              )}
            </div>
            <div className="field">
              <label htmlFor="ob-gname">
                Parent / guardian name <span className="muted">(optional)</span>
              </label>
              <input
                id="ob-gname"
                className="input"
                placeholder="Mary Njeri"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" disabled={onboard.isPending}>
                {onboard.isPending ? 'Creating…' : 'Continue to fingerprint'}
              </button>
            </div>
          </form>
        )}

        {step === 2 && student && (
          <div className="stack">
            <div className="notice notice-info">
              {student.name} created with account <strong>{student.accountNumber}</strong>. Now enroll
              their fingerprint so they can pay at the till.
            </div>

            <FingerprintEnroll
              memberId={student.id}
              secondaryAction={{ label: 'Skip for now', onClick: () => setStep(3) }}
              onEnrolled={() => {
                setEnrolled(true);
                setStep(3);
              }}
            />
          </div>
        )}

        {step === 3 && student && (
          <div className="done-panel">
            <div className="done-badge">
              <IconCheck className="ic" />
            </div>
            <h2>{student.name} is onboarded</h2>
            <p className="muted">
              Account <strong className="mono">{student.accountNumber}</strong>
              {enrolled
                ? '. Fingerprint enrolled and ready to pay.'
                : '. No fingerprint yet; they can be enrolled later.'}
            </p>
            <div className="row" style={{ marginTop: 16 }}>
              <button className="btn btn-primary" onClick={reset}>
                Onboard another student
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
