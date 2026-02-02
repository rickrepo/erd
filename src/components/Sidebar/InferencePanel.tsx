import React from 'react';
import { Check, X, Sparkles, Link2, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { InferredRelationship } from '../../types';

const InferencePanel: React.FC = () => {
  const { pendingInferences, acceptInference, rejectInference, addChatMessage } = useStore();

  const handleAccept = (inference: InferredRelationship) => {
    acceptInference(inference);
    addChatMessage({
      role: 'assistant',
      content: `Added relationship: **${inference.sourceTable}.${inference.sourceColumn}** → **${inference.targetTable}.${inference.targetColumn}**`,
    });
  };

  const handleReject = (index: number) => {
    rejectInference(index);
  };

  const handleAcceptAll = () => {
    pendingInferences.forEach((inference) => {
      acceptInference(inference);
    });
    addChatMessage({
      role: 'assistant',
      content: `Accepted all ${pendingInferences.length} inferred relationships. The ERD has been updated.`,
    });
  };

  const handleRejectAll = () => {
    pendingInferences.forEach(() => {
      rejectInference(0); // Always reject index 0 since array shrinks
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-400 bg-green-400/10';
    if (confidence >= 0.7) return 'text-amber-400 bg-amber-400/10';
    return 'text-slate-400 bg-slate-400/10';
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-auto">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white">Inferred Relationships</h2>
        </div>
        <p className="text-xs text-slate-400">
          These relationships were inferred from column naming patterns. Review and accept the ones
          that are correct.
        </p>
      </div>

      {pendingInferences.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-3">
              <Link2 className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-sm text-slate-400">No pending inferences</p>
            <p className="text-xs text-slate-500 mt-1">
              Parse SQL with tables to see relationship suggestions
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Bulk Actions */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={handleAcceptAll}
              className="flex-1 py-2 px-3 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Accept All ({pendingInferences.length})
            </button>
            <button
              onClick={handleRejectAll}
              className="py-2 px-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          </div>

          {/* Inference List */}
          <div className="flex-1 space-y-3 overflow-auto">
            {pendingInferences.map((inference, index) => (
              <div
                key={`${inference.sourceTable}-${inference.sourceColumn}-${inference.targetTable}-${index}`}
                className="bg-slate-700 rounded-lg p-3 animate-slideIn"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    {/* Relationship */}
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <span className="font-medium text-white">
                        {inference.sourceTable}
                        <span className="text-slate-400">.{inference.sourceColumn}</span>
                      </span>
                      <span className="text-slate-500">→</span>
                      <span className="font-medium text-white">
                        {inference.targetTable}
                        <span className="text-slate-400">.{inference.targetColumn}</span>
                      </span>
                    </div>

                    {/* Confidence & Reason */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getConfidenceColor(
                          inference.confidence
                        )}`}
                      >
                        {Math.round(inference.confidence * 100)}% confident
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">{inference.reason}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleAccept(inference)}
                      className="p-2 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white rounded-lg transition-all"
                      title="Accept"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReject(index)}
                      className="p-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition-all"
                      title="Reject"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="mt-4 p-3 bg-amber-900/20 border border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
              <div className="text-xs text-slate-400">
                <p className="text-amber-300 font-medium mb-1">How does inference work?</p>
                <p>
                  I look for common patterns like <code className="text-slate-300">user_id</code>{' '}
                  → <code className="text-slate-300">users.id</code> and{' '}
                  <code className="text-slate-300">fk_*</code> prefixes to suggest relationships.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default InferencePanel;
