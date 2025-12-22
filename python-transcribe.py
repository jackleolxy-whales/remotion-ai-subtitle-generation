import sys
import os
import json
import warnings

# 检查是否安装了 openai-whisper
try:
    import whisper
except ImportError:
    print("错误: 未检测到 openai-whisper 库。")
    print("请运行以下命令进行安装:")
    print("pip install openai-whisper")
    sys.exit(1)

def get_visual_length(text):
    length = 0
    for char in text:
        if '\u4e00' <= char <= '\u9fff': # 中文字符
            length += 2
        else:
            length += 1
    return length

def transcribe_file(file_path, model_name="small", mode="word"):
    print(f"正在加载 Whisper 模型 '{model_name}'...")
    model = whisper.load_model(model_name)
    
    print(f"正在转录文件: {file_path} (模式: {mode})")
    # 开启 word_timestamps 以获取单词级时间戳
    result = model.transcribe(file_path, verbose=False, word_timestamps=True)
    
    captions = []
    
    # 视觉长度阈值（相当于15个汉字或30个英文字符）
    MAX_VISUAL_LENGTH = 30 
    
    for segment in result["segments"]:
        # 如果模式是 sentence，尝试根据长度进行二次拆分
        if mode == "sentence":
            if "words" not in segment or not segment["words"]:
                # 如果没有单词信息，只能原样输出
                start_ms = int(segment["start"] * 1000)
                end_ms = int(segment["end"] * 1000)
                text = segment["text"].strip()
                if text:
                    captions.append({
                        "startMs": start_ms,
                        "endMs": end_ms,
                        "timestampMs": start_ms,
                        "text": text,
                        "confidence": 1.0,
                        "words": []
                    })
                continue
            
            # 有单词信息，进行智能拆分
            current_chunk_words = []
            current_chunk_len = 0
            
            for w in segment["words"]:
                word_text = w["word"].strip()
                word_len = get_visual_length(word_text)
                
                # 简单处理：如果加上当前词会显著超长，且当前块已经有内容，则先结束当前块
                # 注意：这里我们稍微放宽一点，允许稍微超过一点点，避免单词被切得太碎
                if current_chunk_len + word_len > MAX_VISUAL_LENGTH and current_chunk_words:
                    # 提交当前块
                    chunk_start = current_chunk_words[0]["startMs"]
                    chunk_end = current_chunk_words[-1]["endMs"]
                    chunk_text = "".join([cw["text"] for cw in current_chunk_words]) if any('\u4e00' <= c <= '\u9fff' for c in current_chunk_words[0]["text"]) else " ".join([cw["text"] for cw in current_chunk_words])
                    
                    captions.append({
                        "startMs": chunk_start,
                        "endMs": chunk_end,
                        "timestampMs": chunk_start,
                        "text": chunk_text,
                        "confidence": 1.0,
                        "words": current_chunk_words
                    })
                    
                    # 重置
                    current_chunk_words = []
                    current_chunk_len = 0
                
                # 添加当前词到新块或现有块
                current_chunk_words.append({
                    "text": word_text,
                    "startMs": int(w["start"] * 1000),
                    "endMs": int(w["end"] * 1000),
                    "timestampMs": int(w["start"] * 1000)
                })
                current_chunk_len += word_len
            
            # 提交最后一个块
            if current_chunk_words:
                chunk_start = current_chunk_words[0]["startMs"]
                chunk_end = current_chunk_words[-1]["endMs"]
                # 简单的文本拼接逻辑：如果包含中文，直接拼；否则加空格
                # 这只是个简略判断，可以根据第一个词是否包含中文来定
                has_chinese = any('\u4e00' <= c <= '\u9fff' for c in current_chunk_words[0]["text"])
                chunk_text = "".join([cw["text"] for cw in current_chunk_words]) if has_chinese else " ".join([cw["text"] for cw in current_chunk_words])
                
                captions.append({
                    "startMs": chunk_start,
                    "endMs": chunk_end,
                    "timestampMs": chunk_start,
                    "text": chunk_text,
                    "confidence": 1.0,
                    "words": current_chunk_words
                })
            
            continue

        # 如果模式是 word，优先使用单词级时间戳
        if "words" in segment:
            for word in segment["words"]:
                start_ms = int(word["start"] * 1000)
                end_ms = int(word["end"] * 1000)
                text = word["word"].strip()
                
                # 过滤掉空字符串
                if not text:
                    continue
                    
                captions.append({
                    "startMs": start_ms,
                    "endMs": end_ms,
                    "timestampMs": start_ms,
                    "text": text,
                    "confidence": 1.0
                })
        else:
            # 回退到段落级时间戳
            start_ms = int(segment["start"] * 1000)
            end_ms = int(segment["end"] * 1000)
            text = segment["text"].strip()
            
            captions.append({
                "startMs": start_ms,
                "endMs": end_ms,
                "timestampMs": start_ms,
                "text": text,
                "confidence": 1.0
            })
        
    return captions

def main():
    if len(sys.argv) < 2:
        print("用法: python3 python-transcribe.py <视频或音频文件路径> [模型大小] [模式:word/sentence]")
        print("示例: python3 python-transcribe.py public/sample-video.mp4 small word")
        sys.exit(1)
        
    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(f"错误: 文件 '{file_path}' 不存在")
        sys.exit(1)
        
    model_name = "small"
    if len(sys.argv) > 2:
        model_name = sys.argv[2]
        
    mode = "word"
    if len(sys.argv) > 3:
        mode = sys.argv[3]
        
    try:
        # 1. 执行转录
        captions = transcribe_file(file_path, model_name, mode)
        
        # 2. 生成输出文件名
        # 保持与 Remotion 项目逻辑一致：放在 public 目录，同名 json
        filename = os.path.basename(file_path)
        name_without_ext = os.path.splitext(filename)[0]
        
        # 确保输出到 public 目录
        output_dir = os.path.join(os.getcwd(), "public")
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        output_path = os.path.join(output_dir, f"{name_without_ext}.json")
        
        # 3. 写入 JSON
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(captions, f, indent=2, ensure_ascii=False)
            
        print(f"\n✅ 成功生成字幕文件: {output_path}")
        print(f"共生成 {len(captions)} 条字幕。")
        print("现在你可以刷新 Remotion 预览页面查看效果了。")
        
    except Exception as e:
        print(f"\n❌ 转录失败: {str(e)}")

if __name__ == "__main__":
    main()
