# Quick Start Guide - Comprehensive Graph RAG System

Get up and running with the Graph RAG system in minutes!

## 🚀 Quick Setup (5 minutes)

### 1. Run the Setup Script

```bash
cd comprehensive-plan
python setup.py
```

This will:

- ✅ Check Python version (3.11+ required)
- ✅ Install all dependencies
- ✅ Create .env file
- ✅ Start Neo4j container (if Docker available)

### 2. Add Your Google API Key

Edit the `.env` file and add your Google Gemini API key:

```env
GOOGLE_API_KEY=your_actual_api_key_here
```

### 3. Initialize the System

```bash
python index.py init
```

### 4. Upload Sample Data

```bash
python index.py upload data/sample_medical.txt
python index.py upload data/sample_text.txt
```

### 5. Start Querying!

```bash
python index.py interactive
```

## 📋 Available Commands

| Command                              | Description            |
| ------------------------------------ | ---------------------- |
| `python index.py init`               | Initialize the system  |
| `python index.py upload <file>`      | Upload a document      |
| `python index.py query "<question>"` | Ask a single question  |
| `python index.py interactive`        | Start interactive mode |
| `python index.py stats`              | View graph statistics  |
| `python index.py clear`              | Clear all data         |

## 🔍 Example Queries

Try these example queries:

```bash
# Single query
python index.py query "What are the symptoms of hypertension?"

# Interactive mode
python index.py interactive
# Then type: What treatments are available for diabetes?
```

## 📊 View Statistics

```bash
python index.py stats
```

This shows:

- Total entities and relationships
- Entities by type
- Graph structure information

## 🧪 Run the Demo

```bash
python demo.py
```

This runs a complete demonstration of the system capabilities.

## 🔧 Troubleshooting

### Neo4j Connection Issues

```bash
# Check if Neo4j is running
docker ps

# Start Neo4j if needed
docker start neo4j
```

### API Key Issues

- Ensure your Google API key is valid
- Check that it has Gemini Pro access
- Verify the key is in the `.env` file

### Import Errors

```bash
# Reinstall dependencies
pip install -r requirements.txt
```

## 📁 Project Structure

```
comprehensive-plan/
├── index.py              # Main CLI application
├── setup.py              # Setup script
├── demo.py               # Demo script
├── requirements.txt      # Dependencies
├── README.md            # Full documentation
├── core/                # Core system modules
│   ├── db/             # Database components
│   ├── processing/     # Document processing
│   └── retrieval/      # Retrieval components
└── data/               # Sample data
```

## 🎯 Next Steps

1. **Upload Your Own Documents**:

   ```bash
   python index.py upload your_document.pdf
   python index.py upload your_document.txt
   ```

2. **Explore the Knowledge Graph**:

   - Use interactive mode for conversations
   - Try complex queries about relationships
   - Explore multi-hop reasoning

3. **Customize the System**:

   - Modify entity extraction prompts
   - Adjust exploration depth
   - Add new document types

4. **Scale Up**:
   - Upload larger documents
   - Use external Neo4j instance
   - Deploy as a web service

## 🆘 Need Help?

1. Check the full [README.md](README.md) for detailed documentation
2. Run `python demo.py` to see the system in action
3. Use `python index.py --help` for command help
4. Check the troubleshooting section in README.md

## 🎉 You're Ready!

Your comprehensive Graph RAG system is now set up and ready to use. Start exploring your knowledge graph!
