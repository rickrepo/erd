import React, { useState } from 'react';
import { Check, X, Sparkles, Link2, AlertCircle, Crown, Loader2, Lightbulb, Zap } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuthStore } from '../../store/useAuthStore';
import { runAIAnalysis } from '../../utils/aiMatching';
import type { InferredRelationship } from '../../types';

const InferencePanel: React.FC = () => {
  const { pendingInferences, acceptInference, rejectInference, addChatMessage, tables, setPendingInferences } = useStore();
  const { hasFeature, setShowPremiumModal } = useAuthStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState<string[]>([]);

  const aiEnabled = hasFeature('aiMatchingEnabled');

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
      rejectInference(0);
    });
    setAiInsights([]);
  };

  const handleAIAnalysis = async () => {
    if (!aiEnabled) {
      setShowPremiumModal(true, 'feature');
      return;
    }

    if (tables.length === 0) {
      addChatMessage({
        role: 'assistant',
        content: 'Please add some tables first before running AI analysis.',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await runAIAnalysis(tables);

      // Merge with existing inferences, avoiding duplicates
      const existingKeys = new Set(
        pendingInferences.map(i => `${i.sourceTable}.${i.sourceColumn}-${i.targetTable}.${i.targetColumn}`)
      );

      const newInferences = result.relationships.filter(r => {
        const key = `${r.sourceTable}.${r.sourceColumn}-${r.targetTable}.${r.targetColumn}`;
        return !existingKeys.has(key);
      });

      if (newInferences.length > 0) {
        setPendingInferences([...pendingInferences, ...newInferences]);
      }

      setAiInsights(result.insights);

      addChatMessage({
        role: 'assistant',
        content: `AI analysis complete! Found ${newInferences.length} new potential relationships${result.insights.length > 0 ? ` and ${result.insights.length} insights about your schema.` : '.'}`,
      });
    } catch (error) {
      addChatMessage({
        role: 'assistant',
        content: 'AI analysis encountered an error. Please try again.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-400 bg-green-400/10';
    if (confidence >= 0.7) return 'text-amber-400 bg-amber-400/10';
    return 'text-slate-400 bg-slate-400/10';
  };

  const isAIInference = (inference: InferredRelationship) => {
    return inference.reason.startsWith('AI Analysis:');
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

      {/* AI Analysis Button */}
      <div className="mb-4">
        <button
          onClick={handleAIAnalysis}
          disabled={isAnalyzing || tables.length === 0}
          className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
            aiEnabled
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing with AI...
            </>
          ) : aiEnabled ? (
            <>
              <Zap className="w-4 h-4" />
              Run AI Analysis
            </>
          ) : (
            <>
              <Crown className="w-4 h-4 text-yellow-400" />
              Unlock AI Matching
            </>
          )}
        </button>
        {!aiEnabled && (
          <p className="text-xs text-slate-500 text-center mt-1.5">
            Pro feature - Get smarter relationship detection
          </p>
        )}
      </div>

      {/* AI Insights */}
      {aiInsights.length > 0 && (
        <div className="mb-4 p-3 bg-purple-900/20 border border-purple-700/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">AI Insights</span>
          </div>
          <ul className="space-y-1">
            {aiInsights.map((insight, idx) => (
              <li key={idx} className="text-xs text-slate-400 flex items-start gap-1.5">
                <span className="text-purple-400 mt-0.5">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pendingInferences.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-3">
              <Link2 className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-sm text-slate-400">No pending inferences</p>
            <p className="text-xs text-slate-500 mt-1">
              {tables.length > 0
                ? 'Try running AI analysis to find relationships'
                : 'Parse SQL with tables to see relationship suggestions'}
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
                className={`rounded-lg p-3 animate-slideIn ${
                  isAIInference(inference)
                    ? 'bg-gradient-to-r from-purple-900/30 to-slate-800 border border-purple-700/30'
                    : 'bg-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    {/* AI Badge */}
                    {isAIInference(inference) && (
                      <div className="flex items-center gap-1 mb-1.5">
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        <span className="text-[10px] font-medium text-purple-400 uppercase tracking-wide">
                          AI Detected
                        </span>
                      </div>
                    )}

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

                    <p className="text-xs text-slate-400">
                      {inference.reason.replace('AI Analysis: ', '')}
                    </p>
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
                  Basic inference looks for patterns like <code className="text-slate-300">user_id</code>{' '}
                  → <code className="text-slate-300">users.id</code>.
                  {aiEnabled ? (
                    <span className="text-purple-300"> AI analysis adds semantic understanding and fuzzy matching for better accuracy.</span>
                  ) : (
                    <span> Upgrade to Pro for AI-powered analysis with semantic understanding.</span>
                  )}
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
