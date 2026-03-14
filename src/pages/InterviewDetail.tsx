import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Calendar, Building2, Briefcase, Star, Save, X, Mic, Square, Upload, Play, Loader2, Sparkles, CheckCircle, XCircle, Lightbulb, MessageSquare, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';
import { repository } from '../services/db';
import { Interview } from '../types';
import { generateTranscriptAndReview } from '../services/geminiService';

import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import AudioPlayer from '../components/AudioPlayer';

export default function InterviewDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    company: '',
    position: '',
    round: '',
    score: 0
  });

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingIntervalRef = useRef<number | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateStatus, setGenerateStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      loadInterview(id);
    }
  }, [id]);

  const loadInterview = async (interviewId: string) => {
    const data = await repository.getInterview(interviewId);
    if (data) {
      setInterview(data);
      setEditForm({
        company: data.company,
        position: data.position,
        round: data.round,
        score: data.score || 0
      });
    } else {
      navigate('/');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('确定要删除这条面试记录吗？此操作不可恢复。')) {
      if (id) {
        await repository.deleteInterview(id);
        navigate('/');
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editForm.company || !editForm.position) {
      alert('请填写公司和岗位');
      return;
    }
    
    if (id) {
      await repository.updateInterview(id, {
        company: editForm.company,
        position: editForm.position,
        round: editForm.round,
        score: editForm.score || null
      });
      setIsEditing(false);
      loadInterview(id);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        if (id) {
          await repository.updateInterview(id, { audioBlob });
          loadInterview(id);
        }
        stream.getTracks().forEach(track => track.stop());
        if (recordingIntervalRef.current) {
          window.clearInterval(recordingIntervalRef.current);
        }
        setRecordingTime(0);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("无法访问麦克风，请检查权限设置。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        window.clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && id) {
      await repository.updateInterview(id, { audioBlob: file });
      loadInterview(id);
    }
  };

  const handleGenerate = async () => {
    if (!interview?.audioBlob || !id) return;
    
    setIsGenerating(true);
    setGenerateStatus('准备中...');
    try {
      const settings = await repository.getSettings();
      const resumeText = settings?.resumeText || '';
      
      const { transcript, report } = await generateTranscriptAndReview(
        interview.audioBlob,
        resumeText,
        settings?.resumeFile,
        interview.company,
        interview.position,
        (status) => setGenerateStatus(status)
      );
      
      await repository.updateInterview(id, { transcript, report });
      loadInterview(id);
    } catch (error: any) {
      console.error("Error generating review:", error);
      alert(`生成复盘失败: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setGenerateStatus('');
    }
  };

  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (interview?.audioBlob) {
      const url = URL.createObjectURL(interview.audioBlob);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
    }
  }, [interview?.audioBlob]);

  if (!interview) {
    return <div className="p-4 text-center text-gray-500">加载中...</div>;
  }

  let reportData = null;
  let isLegacyReport = false;
  if (interview.report) {
    try {
      reportData = JSON.parse(interview.report);
    } catch (e) {
      isLegacyReport = true;
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-50 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">面试详情</h1>
        <div className="flex items-center space-x-2">
          {!isEditing && (
            <>
              <button onClick={() => setIsEditing(true)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full">
                <Edit2 size={18} />
              </button>
              <button onClick={handleDelete} className="p-2 text-red-600 hover:bg-red-50 rounded-full">
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full">
        {isEditing ? (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold text-gray-900">编辑面试信息</h2>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">公司名称 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  value={editForm.company}
                  onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">岗位名称 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  value={editForm.position}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">面试轮次</label>
                <select
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                  value={editForm.round}
                  onChange={(e) => setEditForm({ ...editForm, round: e.target.value })}
                >
                  <option value="一面">一面</option>
                  <option value="二面">二面</option>
                  <option value="三面">三面</option>
                  <option value="四面">四面</option>
                  <option value="五面">五面</option>
                  <option value="业务一面">业务一面</option>
                  <option value="业务二面">业务二面</option>
                  <option value="业务三面">业务三面</option>
                  <option value="交叉面">交叉面</option>
                  <option value="HR面">HR面</option>
                  <option value="高管面">高管面</option>
                  <option value="其他">其他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">评分 (1-5)</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  value={editForm.score}
                  onChange={(e) => setEditForm({ ...editForm, score: Number(e.target.value) })}
                />
              </div>

              <button
                onClick={handleSaveEdit}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center mt-4"
              >
                <Save className="w-4 h-4 mr-2" />
                保存修改
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center mb-2">
                  <Building2 className="w-5 h-5 mr-2 text-indigo-500" />
                  {interview.company}
                </h2>
                <p className="text-gray-600 flex items-center">
                  <Briefcase className="w-4 h-4 mr-2 text-gray-400" />
                  {interview.position} <span className="mx-2 text-gray-300">|</span> <span className="text-indigo-600 font-medium">{interview.round}</span>
                </p>
              </div>
              {interview.score && (
                <div className="flex items-center bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-semibold">
                  <Star className="w-4 h-4 mr-1.5 fill-indigo-500 text-indigo-500" />
                  {interview.score}
                </div>
              )}
            </div>
            
            <div className="flex items-center text-sm text-gray-500 pt-4 border-t border-gray-50">
              <Calendar className="w-4 h-4 mr-2" />
              {format(interview.date, 'yyyy年MM月dd日 HH:mm')}
            </div>
          </div>
        )}

        {/* Audio Section */}
        {!isEditing && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">面试音频</h3>
              {interview.audioBlob && (
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-70"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      {generateStatus || '分析中...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      {interview.report ? '重新分析' : '开始 AI 复盘'}
                    </>
                  )}
                </button>
              )}
            </div>
            
            {!interview.audioBlob ? (
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl transition-colors ${
                    isRecording 
                      ? 'border-red-300 text-red-600 bg-red-50' 
                      : 'border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50'
                  }`}
                >
                  {isRecording ? <Square className="w-6 h-6 mb-2 fill-red-600" /> : <Mic className="w-6 h-6 mb-2" />}
                  <span className="text-sm font-medium">
                    {isRecording ? `停止录音 (${formatRecordingTime(recordingTime)})` : '开始录音'}
                  </span>
                </button>
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  <Upload className="w-6 h-6 mb-2" />
                  <span className="text-sm font-medium">上传音频文件</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="audio/*" 
                  className="hidden" 
                />
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-3 shrink-0">
                      <PlayCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">已上传面试录音</p>
                      <p className="text-xs text-gray-500">
                        {!interview.report ? '点击右上角按钮开始 AI 复盘' : '可以随时重新分析'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 shrink-0 ml-2">
                    <a 
                      href={audioUrl || ''}
                      download={`面试录音-${interview.company}-${interview.position}.webm`}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-3 py-1.5 rounded-lg text-center w-full sm:w-auto"
                    >
                      下载
                    </a>
                    <button 
                      onClick={async () => {
                        if (window.confirm('确定要删除录音吗？')) {
                          try {
                            await repository.updateInterview(id!, { 
                              audioBlob: null, 
                              transcript: null, 
                              report: null 
                            });
                            await loadInterview(id!);
                          } catch (e) {
                            console.error("Failed to delete audio:", e);
                            alert("删除失败，请重试");
                          }
                        }
                      }}
                      className="text-sm text-red-600 hover:text-red-800 font-medium bg-red-50 px-3 py-1.5 rounded-lg text-center w-full sm:w-auto"
                    >
                      删除
                    </button>
                  </div>
                </div>
                {audioUrl && <AudioPlayer src={audioUrl} />}
              </div>
            )}
          </div>
        )}

        {/* AI Report Section */}
        {!isEditing && interview.report && (
          <div className="space-y-8">
            {isLegacyReport ? (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-base font-semibold text-gray-900 mb-4">AI 复盘报告</h3>
                <div className="prose prose-sm prose-indigo max-w-none text-gray-600">
                  <Markdown remarkPlugins={[remarkGfm]}>{interview.report}</Markdown>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <Sparkles className="w-6 h-6 mr-2 text-blue-600" />
                    AI 复盘报告
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Strengths */}
                    <div className="bg-green-50/50 border border-green-200 rounded-xl p-5">
                      <h4 className="text-green-700 font-bold flex items-center mb-3 text-base">
                        <CheckCircle className="w-5 h-5 mr-2" />
                        表现亮点
                      </h4>
                      <ul className="space-y-2.5">
                        {reportData.strengths?.map((s: string, i: number) => (
                          <li key={i} className="flex items-start text-sm text-gray-700 leading-relaxed">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 mr-2.5 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Weaknesses */}
                    <div className="bg-red-50/50 border border-red-200 rounded-xl p-5">
                      <h4 className="text-red-700 font-bold flex items-center mb-3 text-base">
                        <XCircle className="w-5 h-5 mr-2" />
                        待改进点
                      </h4>
                      <ul className="space-y-2.5">
                        {reportData.weaknesses?.map((w: string, i: number) => (
                          <li key={i} className="flex items-start text-sm text-gray-700 leading-relaxed">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 mr-2.5 shrink-0" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Suggestions */}
                  <div className="bg-blue-50/30 border border-blue-200 rounded-xl p-5">
                    <h4 className="text-blue-700 font-bold flex items-center mb-3 text-base">
                      <Lightbulb className="w-5 h-5 mr-2" />
                      行动建议
                    </h4>
                    <ul className="space-y-2.5">
                      {reportData.suggestions?.map((s: string, i: number) => (
                        <li key={i} className="flex items-start text-sm text-gray-700 leading-relaxed">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 mr-2.5 shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Q&A Analysis */}
                {reportData.qaAnalysis && reportData.qaAnalysis.length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">详细问答分析</h3>
                    <div className="space-y-4">
                      {reportData.qaAnalysis.map((qa: any, i: number) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                          <div className="relative">
                            <div className="flex items-start mb-3 relative z-10">
                              <div className="bg-[#E8F0FE] text-[#1A73E8] text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center mr-3 shrink-0">
                                Q{i + 1}
                              </div>
                              <h4 className="text-gray-900 font-medium leading-relaxed text-base pt-0.5">{qa.question}</h4>
                            </div>
                            
                            <div className="ml-3.5 pl-7 border-l-2 border-gray-100 space-y-4 pb-1">
                              <div>
                                <div className="text-xs text-gray-500 mb-1 font-medium">您的回答</div>
                                <div className="text-sm text-gray-700 leading-relaxed">{qa.answer}</div>
                              </div>
                              
                              <div className="bg-[#FFF9E6] rounded-lg p-4 border border-[#FFECC7]">
                                <div className="text-xs text-[#B2822D] font-bold mb-1.5">诊断点评</div>
                                <div className="text-sm text-gray-800 leading-relaxed">{qa.review}</div>
                              </div>
                              
                              <div className="bg-[#F0FDF4] rounded-lg p-4 border border-[#DCFCE7]">
                                <div className="text-xs text-[#166534] font-bold mb-1.5">更佳回答示例</div>
                                <div className="text-sm text-gray-800 leading-relaxed">{qa.betterAnswer}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transcript */}
                {(reportData.formattedTranscript?.length > 0 || reportData.rawTextFallback) && (
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2 text-gray-700" />
                      面试转录
                    </h3>
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      {reportData.rawTextFallback ? (
                        <div className="prose prose-sm prose-indigo max-w-none text-gray-600">
                          <Markdown remarkPlugins={[remarkGfm]}>{reportData.rawTextFallback}</Markdown>
                        </div>
                      ) : (
                        <div className="prose prose-sm prose-indigo max-w-none text-gray-600">
                          {reportData.formattedTranscript.map((t: any, i: number) => (
                            <p key={i} className="mb-2">
                              <strong>{t.speaker === 'Interviewer' || t.speaker?.includes('面试官') ? 'Interviewer' : 'Candidate'}:</strong> {t.text}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
