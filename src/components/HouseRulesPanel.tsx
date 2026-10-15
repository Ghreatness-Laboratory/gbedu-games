import React from 'react';
import { Ruleset, PresetName } from '@gbedu/shared';
import { Sliders, RotateCcw, AlertCircle, Shield, Zap, Clock } from 'lucide-react';

interface HouseRulesPanelProps {
  ruleset: Ruleset;
  preset: PresetName;
  isHost: boolean;
  onUpdateRules: (updated: Partial<Ruleset>) => void;
  onApplyPreset: (preset: PresetName) => void;
  onResetRules: () => void;
}

export const HouseRulesPanel: React.FC<HouseRulesPanelProps> = ({
  ruleset,
  preset,
  isHost,
  onUpdateRules,
  onApplyPreset,
  onResetRules,
}) => {
  return (
    <div className="bg-[#0f172a]/95 border border-white/10 rounded-3xl p-5 md:p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-black font-display text-white">House Rules</h3>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
              {preset.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {isHost
              ? 'Configure your room rules. Changing any rule re-confirms all player ready states.'
              : 'Live room rules configured by the host.'}
          </p>
        </div>

        {isHost && (
          <button
            onClick={onResetRules}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 border border-white/10 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Naija Default</span>
          </button>
        )}
      </div>

      {/* Presets Bar */}
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Rule Presets
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              { id: 'naija_classic', label: 'Naija Classic', desc: 'Standard 6 cards & all specials' },
              { id: 'quick_game', label: 'Quick Game', desc: '4 cards & 15s timer' },
              { id: 'no_specials', label: 'No Specials', desc: 'Pure numbers & matching' },
              { id: 'custom', label: 'Custom', desc: 'Custom configured' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              disabled={!isHost || p.id === 'custom'}
              onClick={() => onApplyPreset(p.id)}
              className={`p-3 rounded-2xl border text-left transition-all ${
                preset === p.id
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md shadow-amber-500/10'
                  : 'bg-white/5 border-white/5 text-gray-400 hover:text-white'
              } ${!isHost ? 'cursor-default' : 'cursor-pointer hover:bg-white/10'}`}
            >
              <p className="text-xs font-extrabold">{p.label}</p>
              <p className="text-[10px] opacity-75 mt-0.5 leading-tight">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Primary Game Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Starting Cards */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-300">Starting Cards</span>
            <span className="text-sm font-black text-amber-400 font-mono">{ruleset.startingCards}</span>
          </div>
          {isHost ? (
            <input
              type="range"
              min="4"
              max="8"
              value={ruleset.startingCards}
              onChange={(e) => onUpdateRules({ startingCards: Number(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          ) : (
            <div className="text-[11px] text-gray-500">{ruleset.startingCards} cards dealt each</div>
          )}
        </div>

        {/* Turn Timer */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Turn Timer</span>
            </span>
            <span className="text-xs font-black text-cyan-400">
              {ruleset.turnTimerSec === 0 ? 'Off' : `${ruleset.turnTimerSec}s`}
            </span>
          </div>
          {isHost ? (
            <div className="grid grid-cols-4 gap-1">
              {[0, 15, 30, 60].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onUpdateRules({ turnTimerSec: sec })}
                  className={`py-1 rounded-lg text-xs font-bold border transition-all ${
                    ruleset.turnTimerSec === sec
                      ? 'bg-cyan-500 text-black border-cyan-400'
                      : 'bg-white/5 border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  {sec === 0 ? 'Off' : `${sec}s`}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Callout Penalty */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-300">Callout Penalty</span>
            <span className="text-sm font-black text-rose-400 font-mono">+{ruleset.calloutPenalty}</span>
          </div>
          {isHost ? (
            <input
              type="range"
              min="1"
              max="5"
              value={ruleset.calloutPenalty}
              onChange={(e) => onUpdateRules({ calloutPenalty: Number(e.target.value) })}
              className="w-full accent-rose-500 cursor-pointer"
            />
          ) : (
            <div className="text-[11px] text-gray-500">Draws {ruleset.calloutPenalty} cards if forgotten</div>
          )}
        </div>
      </div>

      {/* Rules Toggles: Pick Passing & Callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          {
            key: 'pickTwoPassing',
            label: 'Pick Two Passing',
            desc: 'Play a 2 on a Pick Two to pass and stack penalties',
            value: ruleset.pickTwoPassing,
          },
          {
            key: 'pickThreePassing',
            label: 'Pick Three Passing',
            desc: 'Play a 5 on a Pick Three to pass and stack penalties',
            value: ruleset.pickThreePassing,
          },
          {
            key: 'crossPassing',
            label: 'Cross-Passing',
            desc: 'Pass a Pick Three onto a Pick Two and vice-versa',
            value: ruleset.crossPassing,
          },
          {
            key: 'whot20DefendsAgainstPicks',
            label: 'Whot 20 Defends Picks',
            desc: 'Playing a Whot cancels any incoming pick penalty',
            value: ruleset.whot20DefendsAgainstPicks,
          },
          {
            key: 'goOutOnSpecial',
            label: 'Go Out On Special',
            desc: 'Last card can be a special card (Hold On, Pick 2, etc.)',
            value: ruleset.goOutOnSpecial,
          },
          {
            key: 'calloutsRequired',
            label: 'Callouts Required',
            desc: 'Must call "Last Card" & "Check Up" or receive penalty',
            value: ruleset.calloutsRequired,
          },
        ].map((item) => (
          <div
            key={item.key}
            className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-3"
          >
            <div>
              <p className="text-xs font-bold text-white">{item.label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{item.desc}</p>
            </div>
            <button
              type="button"
              disabled={!isHost}
              onClick={() => onUpdateRules({ [item.key]: !item.value })}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                item.value ? 'bg-emerald-500' : 'bg-gray-700'
              } ${!isHost ? 'opacity-80 cursor-default' : ''}`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  item.value ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* Individual Specials Toggles */}
      <div>
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Special Card Effects
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { key: 'holdOn', label: '1 Hold On', emoji: '✋' },
            { key: 'pickTwo', label: '2 Pick Two', emoji: '✌️' },
            { key: 'pickThree', label: '5 Pick Three', emoji: '🖐️' },
            { key: 'suspension', label: '8 Suspension', emoji: '🚫' },
            { key: 'generalMarket', label: '14 Market', emoji: '🛒' },
            { key: 'whot', label: '20 Whot Wild', emoji: '👑' },
          ].map((sp) => {
            const active = ruleset.specials[sp.key as keyof typeof ruleset.specials];
            return (
              <button
                key={sp.key}
                type="button"
                disabled={!isHost}
                onClick={() =>
                  onUpdateRules({
                    specials: {
                      ...ruleset.specials,
                      [sp.key]: !active,
                    },
                  })
                }
                className={`p-2.5 rounded-2xl border text-center transition-all ${
                  active
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/5 border-white/5 text-gray-500'
                } ${!isHost ? 'cursor-default' : 'cursor-pointer hover:border-emerald-400/60'}`}
              >
                <div className="text-xl mb-1">{sp.emoji}</div>
                <div className="text-[11px] font-bold">{sp.label}</div>
                <span className="text-[9px] font-extrabold uppercase mt-0.5 block">
                  {active ? 'ON' : 'OFF'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
